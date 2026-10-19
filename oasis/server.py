"""
O.A.S.I.S. API Server.
Connects the React/Vite Space Agriculture Dashboard directly to the
Groq LLM controller and deterministic safety enforcement engine.
"""

import os
from typing import Any, Dict, List, Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import pandas as pd

from oasis.config import DEFAULT_MODEL_ID, SAFETY_LIMITS
from oasis.knowledge import PLANT_KNOWLEDGE_BASE
from oasis.physics import calculate_vpd
from oasis.controller import get_groq_client, query_controller
from oasis.safety import apply_safety_limits
from oasis.telemetry import load_or_create_dataset, stream_frames

app = FastAPI(
    title="O.A.S.I.S. Bio-Habitat API",
    description="LLM-Assisted Biophysical Control & Deterministic Safety Enforcement API",
    version="1.0.0",
)

# Enable CORS for local dev servers
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class TelemetryFrameInput(BaseModel):
    air: Optional[float] = None
    rh: Optional[float] = None
    moisture: Optional[float] = None
    co2: Optional[float] = None
    led: Optional[float] = None
    reservoir: Optional[float] = None
    # Alternate field names
    ambient_temp_c: Optional[float] = None
    relative_humidity_pct: Optional[float] = None
    soil_moisture_pct: Optional[float] = None
    co2_ppm: Optional[float] = None
    led_temp_c: Optional[float] = None
    reservoir_level_pct: Optional[float] = None


class StepRequest(BaseModel):
    crop: str = "potato"
    stage: Optional[str] = None
    frame: TelemetryFrameInput
    model: Optional[str] = None


class StreamRequest(BaseModel):
    crop: str = "potato"
    stage: Optional[str] = None
    model: Optional[str] = None
    max_frames: Optional[int] = None


def normalize_telemetry(t: TelemetryFrameInput) -> Dict[str, float]:
    """Normalize input from either short UI names or long sensor column names."""
    air = t.air if t.air is not None else (t.ambient_temp_c if t.ambient_temp_c is not None else 20.0)
    rh = t.rh if t.rh is not None else (t.relative_humidity_pct if t.relative_humidity_pct is not None else 50.0)
    moisture = t.moisture if t.moisture is not None else (t.soil_moisture_pct if t.soil_moisture_pct is not None else 35.0)
    co2 = t.co2 if t.co2 is not None else (t.co2_ppm if t.co2_ppm is not None else 950.0)
    led = t.led if t.led is not None else (t.led_temp_c if t.led_temp_c is not None else 38.0)
    res = t.reservoir if t.reservoir is not None else (t.reservoir_level_pct if t.reservoir_level_pct is not None else 80.0)

    vpd = calculate_vpd(air, rh)

    return {
        "ambient_temp_c": air,
        "relative_humidity_pct": rh,
        "soil_moisture_pct": moisture,
        "co2_ppm": co2,
        "led_temp_c": led,
        "reservoir_level_pct": res,
        "calculated_vpd_kpa": vpd,
        # Short keys for dashboard UI convenience
        "air": air,
        "rh": rh,
        "moisture": moisture,
        "co2": co2,
        "led": led,
        "reservoir": res,
        "vpd": vpd,
    }


@app.get("/api/healthz")
@app.get("/api/oasis/healthz")
def health_check():
    return {"status": "ok"}


@app.get("/api/oasis/status")
def system_status():
    client = get_groq_client()
    return {
        "status": "online",
        "has_api_key": client is not None,
        "model_id": os.environ.get("OASIS_MODEL_ID") or DEFAULT_MODEL_ID,
        "safety_guard": "active",
        "safety_limits": SAFETY_LIMITS,
    }


@app.get("/api/oasis/crops")
def get_crops():
    return PLANT_KNOWLEDGE_BASE


@app.get("/api/oasis/telemetry")
def get_telemetry(crop: str = "potato"):
    """Return benchmark telemetry frames for specified crop."""
    df = load_or_create_dataset()
    frames = []
    for idx, row in df.iterrows():
        frames.append({
            "index": idx,
            "air": float(row["ambient_temp_c"]),
            "rh": float(row["relative_humidity_pct"]),
            "moisture": float(row["soil_moisture_pct"]),
            "co2": float(row["co2_ppm"]),
            "led": float(row["led_temp_c"]),
            "reservoir": float(row["reservoir_level_pct"]),
            "vpd": calculate_vpd(float(row["ambient_temp_c"]), float(row["relative_humidity_pct"])),
        })
    return {"crop": crop, "frames": frames}


@app.post("/api/oasis/step")
def evaluate_step(req: StepRequest):
    """
    Evaluate one telemetry frame:
      1. Calculate VPD
      2. Query Groq LLM (openai/gpt-oss-120b)
      3. Clamps via deterministic safety supervisor
    """
    crop_id = "potato" if req.crop in ("potato",) else "dwarf_tomato"
    crop_info = PLANT_KNOWLEDGE_BASE.get(crop_id, PLANT_KNOWLEDGE_BASE["potato"])
    stage = req.stage or crop_info.get("default_stage", list(crop_info["stages"].keys())[0])

    telemetry = normalize_telemetry(req.frame)
    client = get_groq_client()

    raw_vector = query_controller(
        telemetry=telemetry,
        crop_id=crop_id,
        stage=stage,
        model_id=req.model,
        client=client,
    )

    safe_vector, interventions = apply_safety_limits(raw_vector, telemetry)

    return {
        "crop": crop_id,
        "stage": stage,
        "telemetry": telemetry,
        "raw_vector": raw_vector,
        "safe_vector": safe_vector,
        "interventions": interventions,
        "source": raw_vector.get("source", "model"),
        "reasoning": safe_vector.get("reasoning", ""),
        "proposed": {
            "irrigation": raw_vector.get("target_irrigation_ml", 0),
            "light": raw_vector.get("light_intensity_pct", 0),
            "rb": raw_vector.get("light_spectrum_ratio_r_b", 4.5),
            "fan": raw_vector.get("ventilation_fan_duty", 0),
        },
        "applied": {
            "irrigation": safe_vector.get("target_irrigation_ml", 0),
            "light": safe_vector.get("light_intensity_pct", 0),
            "rb": safe_vector.get("light_spectrum_ratio_r_b", 4.5),
            "fan": safe_vector.get("ventilation_fan_duty", 0),
        },
    }


@app.post("/api/oasis/stream")
def evaluate_stream(req: StreamRequest):
    """Run full telemetry stream across dataset."""
    crop_id = "potato" if req.crop in ("potato",) else "dwarf_tomato"
    crop_info = PLANT_KNOWLEDGE_BASE.get(crop_id, PLANT_KNOWLEDGE_BASE["potato"])
    stage = req.stage or crop_info.get("default_stage", list(crop_info["stages"].keys())[0])

    df = load_or_create_dataset()
    client = get_groq_client()
    records = []

    for frame in stream_frames(df):
        vpd = calculate_vpd(frame["ambient_temp_c"], frame["relative_humidity_pct"])
        telemetry = {**frame, "calculated_vpd_kpa": vpd}

        raw = query_controller(telemetry, crop_id=crop_id, stage=stage, model_id=req.model, client=client)
        safe, interventions = apply_safety_limits(raw, frame)

        records.append({
            "frame_id": frame["frame_id"],
            "timestamp": frame["timestamp"],
            "telemetry": telemetry,
            "raw_vector": raw,
            "safe_vector": safe,
            "interventions": interventions,
            "source": raw.get("source", "model"),
        })

        if req.max_frames and len(records) >= req.max_frames:
            break

    return {"crop": crop_id, "stage": stage, "total_frames": len(records), "records": records}


# ---------------------------------------------------------------------------
# On-demand simulation endpoint
# ---------------------------------------------------------------------------

import random
from datetime import datetime, timedelta

SCENARIO_PRESETS = {
    "optimal": {
        "label": "Optimal Conditions",
        "description": "Nominal operating window — all sensors within target range",
        "base": {"air": 20.5, "rh": 62, "moisture": 40, "co2": 950, "led": 38, "reservoir": 80},
        "drift": {"air": 0.8, "rh": 3, "moisture": 2, "co2": 30, "led": 2, "reservoir": 1},
    },
    "heat_stress": {
        "label": "Heat Stress",
        "description": "Air temperature rising above crop comfort zone",
        "base": {"air": 28.5, "rh": 35, "moisture": 22, "co2": 1080, "led": 55, "reservoir": 65},
        "drift": {"air": 2.0, "rh": 5, "moisture": 4, "co2": 60, "led": 5, "reservoir": 3},
    },
    "drought": {
        "label": "Drought / Dry Media",
        "description": "Substrate moisture critically low, simulating irrigation failure",
        "base": {"air": 23, "rh": 30, "moisture": 10, "co2": 1000, "led": 42, "reservoir": 45},
        "drift": {"air": 1.5, "rh": 4, "moisture": 3, "co2": 40, "led": 3, "reservoir": 5},
    },
    "led_overtemp": {
        "label": "LED Overtemperature",
        "description": "LED panel exceeding 60 °C thermal safety threshold",
        "base": {"air": 22, "rh": 55, "moisture": 38, "co2": 960, "led": 65, "reservoir": 75},
        "drift": {"air": 1.0, "rh": 3, "moisture": 2, "co2": 25, "led": 4, "reservoir": 2},
    },
    "reservoir_empty": {
        "label": "Empty Reservoir",
        "description": "Water reservoir below 5 % interlock threshold",
        "base": {"air": 21, "rh": 58, "moisture": 30, "co2": 940, "led": 40, "reservoir": 3},
        "drift": {"air": 0.5, "rh": 2, "moisture": 3, "co2": 20, "led": 2, "reservoir": 1},
    },
    "high_co2": {
        "label": "High CO₂",
        "description": "CO₂ elevated beyond 1200 ppm — photosynthetic stress risk",
        "base": {"air": 24, "rh": 50, "moisture": 35, "co2": 1350, "led": 44, "reservoir": 70},
        "drift": {"air": 1.2, "rh": 4, "moisture": 3, "co2": 100, "led": 3, "reservoir": 3},
    },
}


class SimulateRequest(BaseModel):
    crop: str = "potato"
    stage: Optional[str] = None
    model: Optional[str] = None
    scenario: Optional[str] = None          # preset name from SCENARIO_PRESETS
    num_frames: int = 6                     # how many frames to generate (1-20)
    # Custom base sensor values (override preset or provide standalone)
    air: Optional[float] = None
    rh: Optional[float] = None
    moisture: Optional[float] = None
    co2: Optional[float] = None
    led: Optional[float] = None
    reservoir: Optional[float] = None
    randomize: bool = True                  # add random drift between frames


@app.get("/api/oasis/scenarios")
def list_scenarios():
    """Return available simulation scenario presets."""
    return {k: {"label": v["label"], "description": v["description"], "base": v["base"]} for k, v in SCENARIO_PRESETS.items()}


@app.post("/api/oasis/simulate")
def run_simulation(req: SimulateRequest):
    """
    Run an on-demand simulation:
      1. Pick a scenario preset OR use custom sensor values
      2. Generate N telemetry frames with optional random perturbation
      3. Run each frame through the full LLM + safety pipeline
    """
    num = max(1, min(20, req.num_frames))
    crop_id = req.crop if req.crop in PLANT_KNOWLEDGE_BASE else "potato"
    crop_info = PLANT_KNOWLEDGE_BASE[crop_id]
    stage = req.stage or crop_info.get("default_stage", list(crop_info["stages"].keys())[0])
    client = get_groq_client()

    # Resolve base sensor values
    preset = SCENARIO_PRESETS.get(req.scenario or "", SCENARIO_PRESETS["optimal"])
    base = dict(preset["base"])
    drift = dict(preset["drift"])

    # Allow per-field overrides from the request
    if req.air is not None:
        base["air"] = req.air
    if req.rh is not None:
        base["rh"] = req.rh
    if req.moisture is not None:
        base["moisture"] = req.moisture
    if req.co2 is not None:
        base["co2"] = req.co2
    if req.led is not None:
        base["led"] = req.led
    if req.reservoir is not None:
        base["reservoir"] = req.reservoir

    now = datetime.utcnow()
    records = []

    for i in range(num):
        # Build per-frame values with optional drift
        if req.randomize and i > 0:
            frame_vals = {
                k: max(0, base[k] + random.uniform(-drift[k], drift[k]))
                for k in base
            }
        else:
            frame_vals = dict(base)

        # Clamp sensor ranges to physical reality
        frame_vals["air"] = round(max(-10, min(50, frame_vals["air"])), 1)
        frame_vals["rh"] = round(max(0, min(100, frame_vals["rh"])), 1)
        frame_vals["moisture"] = round(max(0, min(100, frame_vals["moisture"])), 1)
        frame_vals["co2"] = round(max(200, min(5000, frame_vals["co2"])))
        frame_vals["led"] = round(max(0, min(120, frame_vals["led"])), 1)
        frame_vals["reservoir"] = round(max(0, min(100, frame_vals["reservoir"])), 1)

        timestamp = (now + timedelta(minutes=i * 15)).isoformat() + "Z"

        telemetry_raw = {
            "ambient_temp_c": frame_vals["air"],
            "relative_humidity_pct": frame_vals["rh"],
            "soil_moisture_pct": frame_vals["moisture"],
            "co2_ppm": frame_vals["co2"],
            "led_temp_c": frame_vals["led"],
            "reservoir_level_pct": frame_vals["reservoir"],
            "frame_id": i + 1,
            "timestamp": timestamp,
        }

        vpd = calculate_vpd(frame_vals["air"], frame_vals["rh"])
        telemetry = {**telemetry_raw, "calculated_vpd_kpa": vpd}

        raw = query_controller(telemetry, crop_id=crop_id, stage=stage, model_id=req.model, client=client)
        safe, interventions = apply_safety_limits(raw, telemetry_raw)

        records.append({
            "frame_id": i + 1,
            "timestamp": timestamp,
            "telemetry": {
                **telemetry,
                "air": frame_vals["air"],
                "rh": frame_vals["rh"],
                "moisture": frame_vals["moisture"],
                "co2": frame_vals["co2"],
                "led": frame_vals["led"],
                "reservoir": frame_vals["reservoir"],
                "vpd": vpd,
            },
            "raw_vector": raw,
            "safe_vector": safe,
            "interventions": interventions,
            "source": raw.get("source", "model"),
            "reasoning": safe.get("reasoning", raw.get("reasoning", "")),
            "proposed": {
                "irrigation": raw.get("target_irrigation_ml", 0),
                "light": raw.get("light_intensity_pct", 0),
                "rb": raw.get("light_spectrum_ratio_r_b", 4.5),
                "fan": raw.get("ventilation_fan_duty", 0),
            },
            "applied": {
                "irrigation": safe.get("target_irrigation_ml", 0),
                "light": safe.get("light_intensity_pct", 0),
                "rb": safe.get("light_spectrum_ratio_r_b", 4.5),
                "fan": safe.get("ventilation_fan_duty", 0),
            },
        })

    return {
        "crop": crop_id,
        "stage": stage,
        "scenario": req.scenario or "custom",
        "total_frames": len(records),
        "records": records,
    }


# Mount built React/Vite dashboard if present
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pathlib import Path

dist_dir = Path(__file__).resolve().parent.parent / "artifacts" / "oasis-space-agriculture" / "dist" / "public"
if dist_dir.exists():
    if (dist_dir / "assets").exists():
        app.mount("/assets", StaticFiles(directory=str(dist_dir / "assets")), name="assets")
    if (dist_dir / "images").exists():
        app.mount("/images", StaticFiles(directory=str(dist_dir / "images")), name="images")

    @app.get("/{full_path:path}")
    def serve_spa(full_path: str):
        target = dist_dir / full_path
        if full_path and target.is_file():
            return FileResponse(target)
        return FileResponse(dist_dir / "index.html")


def start_server(host: str = "0.0.0.0", port: int = 5000):
    import uvicorn
    print(f"\n========================================================")
    print(f"  O.A.S.I.S. Space Agriculture System (v1.0.0)")
    print(f"  Live React Dashboard: http://localhost:{port}")
    print(f"  Interactive API Docs: http://localhost:{port}/docs")
    print(f"========================================================\n")
    uvicorn.run(app, host=host, port=port)


if __name__ == "__main__":
    start_server()
