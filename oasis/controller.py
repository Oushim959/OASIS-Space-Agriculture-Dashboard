"""
O.A.S.I.S. LLM Controller & Actuation Engine.
Interacts with the Groq API to obtain biophysically reasoned actuation vectors,
with deterministic fallback mechanisms.
"""

import json
import os
import re
from typing import Any, Dict, Optional

from dotenv import load_dotenv

from oasis.config import DEFAULT_MODEL_ID, FALLBACK_VECTOR
from oasis.knowledge import PLANT_KNOWLEDGE_BASE

# Load variables from .env file if available
load_dotenv()

SYSTEM_PROMPT = """You are O.A.S.I.S. (Orbital Adaptive Smart Irrigation & Sustenance), an AI bio-habitat control engine.
Analyze incoming telemetry, biophysical targets, and microgravity risk factors.
Output ONLY a valid JSON object matching this exact schema:
{
  "target_irrigation_ml": integer (0-150),
  "light_spectrum_ratio_r_b": float (Red to Blue ratio, e.g., 4.5),
  "light_intensity_pct": integer (0-100),
  "ventilation_fan_duty": integer (0-100),
  "reasoning": "Concise biological and physical justification."
}"""


def get_groq_client(api_key: Optional[str] = None):
    """
    Instantiate Groq client from environment or Kaggle secrets.
    Returns None if no API key is found.
    """
    key = api_key or os.environ.get("GROQ_API_KEY")
    if not key:
        try:
            from kaggle_secrets import UserSecretsClient
            key = UserSecretsClient().get_secret("GROQ_API_KEY")
        except Exception:
            key = None

    if not key:
        return None

    try:
        from groq import Groq
        return Groq(api_key=key)
    except Exception:
        return None


def build_user_prompt(telemetry: Dict[str, Any], crop_id: str, stage: str) -> str:
    """Format structured context and telemetry into prompt string for LLM."""
    crop = PLANT_KNOWLEDGE_BASE.get(crop_id, PLANT_KNOWLEDGE_BASE["potato"])
    stage_data = crop["stages"].get(stage, {})
    return (
        f"CROP: {crop['display_name']} | STAGE: {stage.upper()}\n"
        f"TARGET METRICS: {json.dumps(stage_data)}\n"
        f"SPACE RISKS: {crop['space_risks']}\n"
        f"INCOMING TELEMETRY FRAME: {json.dumps(telemetry, indent=2, default=str)}"
    )


def parse_vector(text: str) -> Dict[str, Any]:
    """
    Extract and validate the JSON control vector from model output.
    Handles code blocks, extra text, and number coercion.
    """
    text = text.strip()
    match = re.search(r"\{.*\}", text, re.DOTALL)
    if not match:
        raise ValueError(f"No JSON object found in text: {text[:100]}...")

    data = json.loads(match.group(0))
    return {
        "target_irrigation_ml": int(round(float(data["target_irrigation_ml"]))),
        "light_spectrum_ratio_r_b": float(data["light_spectrum_ratio_r_b"]),
        "light_intensity_pct": int(round(float(data["light_intensity_pct"]))),
        "ventilation_fan_duty": int(round(float(data["ventilation_fan_duty"]))),
        "reasoning": str(data.get("reasoning", "")),
    }


def query_controller(
    telemetry: Dict[str, Any],
    crop_id: str = "potato",
    stage: str = "tuber_bulking",
    model_id: Optional[str] = None,
    client: Optional[Any] = None,
) -> Dict[str, Any]:
    """
    Ask the LLM controller for an actuation vector.
    Falls back gracefully to FALLBACK_VECTOR if client is unavailable or an error occurs.
    """
    model = model_id or os.environ.get("OASIS_MODEL_ID") or DEFAULT_MODEL_ID
    groq_client = client or get_groq_client()

    if groq_client is None:
        return {
            **FALLBACK_VECTOR,
            "reasoning": "Fallback vector: no Groq API key configured (set GROQ_API_KEY in .env or environment).",
            "source": "fallback",
        }

    try:
        response = groq_client.chat.completions.create(
            model=model,
            temperature=0.2,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": build_user_prompt(telemetry, crop_id, stage)},
            ],
        )
        content = response.choices[0].message.content
        parsed = parse_vector(content)
        return {**parsed, "source": "model"}
    except Exception as exc:
        return {
            **FALLBACK_VECTOR,
            "reasoning": f"Fallback vector triggered by error: {exc}",
            "source": "fallback",
        }
