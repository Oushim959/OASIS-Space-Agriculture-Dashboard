"""
O.A.S.I.S. Biophysical & Atmospheric Calculations.
"""

import math


def calculate_saturation_vapor_pressure(temp_c: float) -> float:
    """
    Compute saturation vapor pressure (e_s) in kPa using Tetens approximation.
    e_s = 0.61078 * exp((17.27 * T) / (T + 237.3))
    """
    return 0.61078 * math.exp((17.27 * temp_c) / (temp_c + 237.3))


def calculate_vpd(temp_c: float, rh_pct: float) -> float:
    """
    Compute Vapor Pressure Deficit (VPD) in kPa from temperature (°C) and
    relative humidity (%) using the Tetens formula.

    VPD = e_s * (1 - RH / 100)

    Args:
        temp_c: Ambient temperature in Celsius.
        rh_pct: Relative humidity percentage (0-100).

    Returns:
        VPD in kPa rounded to 3 decimal places.
    """
    vp_sat = calculate_saturation_vapor_pressure(temp_c)
    vpd = vp_sat * (1.0 - (rh_pct / 100.0))
    return round(max(0.0, vpd), 3)
