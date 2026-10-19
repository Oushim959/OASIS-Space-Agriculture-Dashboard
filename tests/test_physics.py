"""
Unit tests for O.A.S.I.S. biophysical and VPD calculations.
"""

import pytest
from oasis.physics import calculate_vpd, calculate_saturation_vapor_pressure


def test_calculate_saturation_vapor_pressure():
    # At 20°C, saturation vapor pressure is ~2.338 kPa
    vp_sat = calculate_saturation_vapor_pressure(20.0)
    assert 2.30 < vp_sat < 2.40


def test_calculate_vpd_nominal():
    # At 20.1°C and 64% RH:
    # vp_sat = 0.61078 * exp((17.27 * 20.1) / (20.1 + 237.3)) = 2.352 kPa
    # VPD = 2.352 * (1 - 0.64) = 0.846 kPa
    vpd = calculate_vpd(20.1, 64.0)
    assert vpd == 0.847 or abs(vpd - 0.847) <= 0.002


def test_calculate_vpd_saturated():
    # At 100% relative humidity, VPD must be 0
    vpd = calculate_vpd(25.0, 100.0)
    assert vpd == 0.0


def test_calculate_vpd_dry():
    # At 0% relative humidity, VPD equals saturation vapor pressure
    vpd = calculate_vpd(20.0, 0.0)
    assert vpd > 2.0
