"""
O.A.S.I.S. Bio-Habitat Agents.
Provides high-level object-oriented agent interfaces for autonomous space-habitat control.
"""

from typing import Any, Dict, List, Optional
import pandas as pd

from oasis.config import DEFAULT_MODEL_ID, FALLBACK_VECTOR, SAFETY_LIMITS
from oasis.knowledge import get_crop_profile, get_stage_targets
from oasis.physics import calculate_vpd
from oasis.controller import get_groq_client, query_controller
from oasis.safety import apply_safety_limits
from oasis.telemetry import generate_benchmark_telemetry, stream_frames


class SafetySupervisorAgent:
    """
    Deterministic safety supervisor that validates and restricts actuator proposals.
    Operates independently of LLMs to prevent hardware damage and biological catastrophe.
    """

    def __init__(self, limits: Optional[Dict[str, Any]] = None):
        self.limits = limits or SAFETY_LIMITS

    def enforce(
        self, proposed_vector: Dict[str, Any], telemetry: Dict[str, Any]
    ) -> tuple[Dict[str, Any], List[Dict[str, str]]]:
        """Verify and clamp actuation values to safe operating margins."""
        return apply_safety_limits(proposed_vector, telemetry, limits=self.limits)


class OasisHabitatAgent:
    """
    Autonomous Bio-Habitat Closed-Loop Control Agent.
    Orchestrates telemetry ingestion, psychrometric derivation, LLM proposal inference,
    and deterministic safety supervision.
    """

    def __init__(
        self,
        crop: str = "potato",
        stage: Optional[str] = None,
        model_id: str = DEFAULT_MODEL_ID,
        api_key: Optional[str] = None,
    ):
        self.crop_id = crop
        self.crop_profile = get_crop_profile(crop)
        self.stage = stage or self.crop_profile.get("default_stage", "tuber_bulking")
        self.targets = get_stage_targets(self.crop_id, self.stage)
        self.model_id = model_id
        self.groq_client = get_groq_client(api_key=api_key)
        self.supervisor = SafetySupervisorAgent()
        self.history: List[Dict[str, Any]] = []

    @property
    def is_online(self) -> bool:
        """True if Groq API client is available and active."""
        return self.groq_client is not None

    def step(self, raw_telemetry: Dict[str, Any]) -> Dict[str, Any]:
        """
        Execute one control cycle step with incoming sensor telemetry.
        """
        temp = raw_telemetry.get("ambient_temp_c", 20.0)
        rh = raw_telemetry.get("relative_humidity_pct", 50.0)
        vpd = calculate_vpd(temp, rh)

        enriched_telemetry = dict(raw_telemetry)
        enriched_telemetry["calculated_vpd_kpa"] = vpd

        raw_vector = query_controller(
            telemetry=enriched_telemetry,
            crop_id=self.crop_id,
            stage=self.stage,
            model_id=self.model_id,
            client=self.groq_client,
        )

        safe_vector, interventions = self.supervisor.enforce(raw_vector, raw_telemetry)

        record = {
            "step": len(self.history) + 1,
            "telemetry": enriched_telemetry,
            "raw_vector": raw_vector,
            "safe_vector": safe_vector,
            "interventions": interventions,
        }
        self.history.append(record)
        return record

    def run_dataframe(self, df: pd.DataFrame, max_frames: Optional[int] = None) -> List[Dict[str, Any]]:
        """Run continuous stream across a pandas telemetry DataFrame."""
        records = []
        for frame in stream_frames(df):
            rec = self.step(frame)
            records.append(rec)
            if max_frames and len(records) >= max_frames:
                break
        return records

    def reset(self):
        """Reset historical memory."""
        self.history.clear()
