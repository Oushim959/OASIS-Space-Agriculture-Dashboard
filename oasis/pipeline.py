"""
O.A.S.I.S. Core Pipeline Execution & Result Aggregation.
Ingest -> Derive (VPD) -> Propose (LLM) -> Validate & Clamp (Deterministic Safety).
"""

from typing import Any, Dict, List, Optional
import pandas as pd

from oasis.physics import calculate_vpd
from oasis.controller import query_controller
from oasis.safety import apply_safety_limits
from oasis.telemetry import stream_frames


def process_frame(
    frame: Dict[str, Any],
    crop_id: str = "potato",
    stage: str = "tuber_bulking",
    model_id: Optional[str] = None,
    client: Optional[Any] = None,
) -> Dict[str, Any]:
    """
    Process a single sensor telemetry frame through the 4-stage pipeline:
      1. Ingest: Parse sensor telemetry.
      2. Derive: Calculate vapor pressure deficit (VPD).
      3. Propose: Query LLM controller for biophysical actuation vector.
      4. Validate: Clamp proposal via hard safety rules.

    Returns:
        Structured frame execution record.
    """
    vpd = calculate_vpd(frame["ambient_temp_c"], frame["relative_humidity_pct"])
    telemetry = {**frame, "calculated_vpd_kpa": vpd}

    raw_vector = query_controller(
        telemetry,
        crop_id=crop_id,
        stage=stage,
        model_id=model_id,
        client=client,
    )
    safe_vector, interventions = apply_safety_limits(raw_vector, frame)

    return {
        "frame_id": frame["frame_id"],
        "telemetry": telemetry,
        "raw_vector": raw_vector,
        "safe_vector": safe_vector,
        "interventions": interventions,
    }


def run_pipeline(
    df: pd.DataFrame,
    crop_id: str = "potato",
    stage: str = "tuber_bulking",
    max_frames: Optional[int] = None,
    model_id: Optional[str] = None,
    client: Optional[Any] = None,
) -> List[Dict[str, Any]]:
    """
    Execute pipeline across a stream of telemetry frames.
    """
    records = []
    for frame in stream_frames(df):
        record = process_frame(
            frame,
            crop_id=crop_id,
            stage=stage,
            model_id=model_id,
            client=client,
        )
        records.append(record)
        if max_frames and len(records) >= max_frames:
            break
    return records


def build_results_table(records: List[Dict[str, Any]]) -> pd.DataFrame:
    """
    Flatten execution records into a comprehensive analysis DataFrame.
    """
    rows = []
    for r in records:
        t, raw, safe = r["telemetry"], r["raw_vector"], r["safe_vector"]
        rows.append({
            "frame_id": r["frame_id"],
            "time": pd.Timestamp(t["timestamp"]),
            "temp_c": t["ambient_temp_c"],
            "rh_pct": t["relative_humidity_pct"],
            "vpd_kpa": t["calculated_vpd_kpa"],
            "soil_pct": t["soil_moisture_pct"],
            "co2_ppm": t["co2_ppm"],
            "led_temp_c": t["led_temp_c"],
            "reservoir_pct": t["reservoir_level_pct"],
            "irrigation_raw": raw["target_irrigation_ml"],
            "irrigation": safe["target_irrigation_ml"],
            "light_raw": raw["light_intensity_pct"],
            "light": safe["light_intensity_pct"],
            "fan_raw": raw["ventilation_fan_duty"],
            "fan": safe["ventilation_fan_duty"],
            "rb_raw": raw["light_spectrum_ratio_r_b"],
            "rb": safe["light_spectrum_ratio_r_b"],
            "interventions": [i["rule"] for i in r["interventions"]],
            "reasoning": safe.get("reasoning", ""),
            "source": raw.get("source", "unknown"),
        })
    return pd.DataFrame(rows)


def build_summary_table(results: pd.DataFrame) -> pd.DataFrame:
    """
    Format results with 'proposed -> applied' diff notation when safety clamping occurs.
    """
    def format_diff(raw_col, safe_col):
        return [
            f"{a:g}" if a == b else f"{a:g} -> {b:g}"
            for a, b in zip(raw_col, safe_col)
        ]

    summary = pd.DataFrame({
        "time": results["time"].dt.strftime("%H:%M"),
        "VPD (kPa)": results["vpd_kpa"].map(lambda v: f"{v:.3f}"),
        "soil (%)": results["soil_pct"].map(lambda v: f"{v:.1f}"),
        "LED (°C)": results["led_temp_c"].map(lambda v: f"{v:.1f}"),
        "reservoir (%)": results["reservoir_pct"].map(lambda v: f"{v:.1f}"),
        "irrigation (ml)": format_diff(results["irrigation_raw"], results["irrigation"]),
        "light (%)": format_diff(results["light_raw"], results["light"]),
        "fan (%)": format_diff(results["fan_raw"], results["fan"]),
        "interventions": results["interventions"].map(lambda r: ", ".join(r) if r else "none"),
        "source": results["source"],
    }).set_index("time")

    return summary
