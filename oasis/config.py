"""
O.A.S.I.S.: Orbital Adaptive Smart Irrigation & Sustenance
Core configuration, safety thresholds, and default actuation vectors.
"""

from pathlib import Path

# Package Metadata
__version__ = "1.0.0"

# Hard Deterministic Safety Limits
SAFETY_LIMITS = {
    "max_led_temp_c": 60.0,
    "led_overtemp_intensity_pct": 15,
    "min_reservoir_pct": 5.0,
    "max_irrigation_ml": 150,
}

# Rule Display Names
RULE_LABELS = {
    "led_overtemp": "LED over-temperature",
    "dry_reservoir": "Dry-pump protection",
    "irrigation_cap": "Irrigation volume cap",
}

# Default Fallback Actuation Vector (used during offline / fallback states)
FALLBACK_VECTOR = {
    "target_irrigation_ml": 45,
    "light_spectrum_ratio_r_b": 4.5,
    "light_intensity_pct": 80,
    "ventilation_fan_duty": 60,
}

# Default Model Selection
DEFAULT_MODEL_ID = "openai/gpt-oss-120b"

# Telemetry Schema
TELEMETRY_COLUMNS = [
    "ambient_temp_c",
    "relative_humidity_pct",
    "soil_moisture_pct",
    "co2_ppm",
    "led_temp_c",
    "reservoir_level_pct",
]

# Default File Paths
DEFAULT_DATA_PATH = Path("oasis_telemetry_dataset.csv")
DEFAULT_CONDITIONS_PLOT = "oasis_conditions.png"
DEFAULT_CONTROLLER_PLOT = "oasis_controller_output.png"
DEFAULT_RESPONSE_PLOT = "oasis_response_check.png"
