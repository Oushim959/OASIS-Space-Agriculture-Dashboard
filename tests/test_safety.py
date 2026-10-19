"""
Unit tests for O.A.S.I.S. deterministic safety clamping.
"""

from oasis.safety import apply_safety_limits
from oasis.config import SAFETY_LIMITS


def test_safety_nominal_no_interventions():
    vector = {
        "target_irrigation_ml": 50,
        "light_intensity_pct": 80,
        "ventilation_fan_duty": 60,
        "light_spectrum_ratio_r_b": 4.5,
    }
    telemetry = {
        "led_temp_c": 40.0,
        "reservoir_level_pct": 75.0,
    }

    safe, interventions = apply_safety_limits(vector, telemetry)
    assert safe["target_irrigation_ml"] == 50
    assert safe["light_intensity_pct"] == 80
    assert len(interventions) == 0


def test_safety_led_overtemperature():
    vector = {
        "target_irrigation_ml": 50,
        "light_intensity_pct": 90,
    }
    telemetry = {
        "led_temp_c": 63.5,  # Exceeds 60.0°C
        "reservoir_level_pct": 75.0,
    }

    safe, interventions = apply_safety_limits(vector, telemetry)
    assert safe["light_intensity_pct"] == SAFETY_LIMITS["led_overtemp_intensity_pct"]  # 15%
    rules = [i["rule"] for i in interventions]
    assert "led_overtemp" in rules


def test_safety_dry_reservoir_protection():
    vector = {
        "target_irrigation_ml": 100,
        "light_intensity_pct": 80,
    }
    telemetry = {
        "led_temp_c": 35.0,
        "reservoir_level_pct": 3.5,  # Below 5.0% floor
    }

    safe, interventions = apply_safety_limits(vector, telemetry)
    assert safe["target_irrigation_ml"] == 0
    rules = [i["rule"] for i in interventions]
    assert "dry_reservoir" in rules


def test_safety_irrigation_cap():
    vector = {
        "target_irrigation_ml": 250,  # Exceeds 150ml cap
        "light_intensity_pct": 80,
    }
    telemetry = {
        "led_temp_c": 35.0,
        "reservoir_level_pct": 50.0,
    }

    safe, interventions = apply_safety_limits(vector, telemetry)
    assert safe["target_irrigation_ml"] == SAFETY_LIMITS["max_irrigation_ml"]  # 150ml
    rules = [i["rule"] for i in interventions]
    assert "irrigation_cap" in rules


def test_safety_multiple_simultaneous_rules():
    vector = {
        "target_irrigation_ml": 200,
        "light_intensity_pct": 100,
    }
    telemetry = {
        "led_temp_c": 65.0,        # Triggers led_overtemp
        "reservoir_level_pct": 2.0, # Triggers dry_reservoir (sets to 0, which also satisfies cap)
    }

    safe, interventions = apply_safety_limits(vector, telemetry)
    assert safe["light_intensity_pct"] == 15
    assert safe["target_irrigation_ml"] == 0
    rules = [i["rule"] for i in interventions]
    assert "led_overtemp" in rules
    assert "dry_reservoir" in rules
