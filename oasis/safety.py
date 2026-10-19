"""
O.A.S.I.S. Deterministic Safety Limit Enforcement.
Clamps proposed actuation vectors to hard limits to ensure biological and hardware safety.
"""

from typing import Any, Dict, List, Tuple
from oasis.config import SAFETY_LIMITS


def apply_safety_limits(
    vector: Dict[str, Any],
    telemetry: Dict[str, Any],
    limits: Dict[str, Any] = None,
) -> Tuple[Dict[str, Any], List[Dict[str, str]]]:
    """
    Clamp a proposed control vector against deterministic hardware and safety limits.
    Rules only ever REDUCE or RESTRICT actuation; never expand or invent actuation commands.

    Rules applied:
      1. led_overtemp: If LED temperature >= max_led_temp_c (60°C), clamp light intensity to 15%.
      2. dry_reservoir: If reservoir level < min_reservoir_pct (5%), set irrigation to 0 ml (pump protection).
      3. irrigation_cap: If requested irrigation > max_irrigation_ml (150 ml), clamp to 150 ml.

    Args:
        vector: Proposed actuation vector (dictionary).
        telemetry: Current sensor telemetry readings.
        limits: Optional custom safety limits dict (defaults to SAFETY_LIMITS).

    Returns:
        A tuple of:
          - safe_vector: Corrected actuation dictionary.
          - interventions: List of dicts specifying rule triggered and explanation.
    """
    limits = limits or SAFETY_LIMITS
    safe = dict(vector)
    interventions: List[Dict[str, str]] = []

    def log_intervention(rule: str, message: str):
        interventions.append({"rule": rule, "message": message})

    # Rule 1: LED Array Over-temperature Protection
    led_temp = telemetry.get("led_temp_c", 0.0)
    if led_temp >= limits["max_led_temp_c"]:
        cap = limits["led_overtemp_intensity_pct"]
        current_light = safe.get("light_intensity_pct", 100)
        safe["light_intensity_pct"] = min(current_light, cap)
        log_intervention(
            "led_overtemp",
            f"LED at {led_temp} °C (limit {limits['max_led_temp_c']}): light capped at {cap}%",
        )

    # Rule 2: Dry-Pump Reservoir Depletion Protection
    reservoir = telemetry.get("reservoir_level_pct", 100.0)
    if reservoir < limits["min_reservoir_pct"]:
        safe["target_irrigation_ml"] = 0
        log_intervention(
            "dry_reservoir",
            f"Reservoir at {reservoir}% (minimum {limits['min_reservoir_pct']}%): pump disabled",
        )

    # Rule 3: Maximum Single-Cycle Irrigation Cap
    if safe.get("target_irrigation_ml", 0) > limits["max_irrigation_ml"]:
        safe["target_irrigation_ml"] = limits["max_irrigation_ml"]
        log_intervention(
            "irrigation_cap",
            f"Irrigation reduced to the {limits['max_irrigation_ml']} ml limit",
        )

    return safe, interventions
