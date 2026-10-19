"""
O.A.S.I.S. Plant Knowledge Base.
Contains biological targets, growth stages, and microgravity/space-specific risk profiles.
"""

from typing import Any, Dict, List

PLANT_KNOWLEDGE_BASE: Dict[str, Dict[str, Any]] = {
    "potato": {
        "display_name": "Solanum tuberosum (Martian regolith)",
        "default_stage": "tuber_bulking",
        "stages": {
            "tuber_bulking": {
                "vpd_target_kpa": (0.8, 1.2),
                "dli_target": 18,
                "temp_c": (18.0, 22.0),
                "soil_moisture_pct": (35.0, 45.0),
            }
        },
        "space_risks": [
            "Perchlorate soil saturation",
            "Substrate capillary waterlogging",
            "Root zone hypoxia",
        ],
    },
    "dwarf_tomato": {
        "display_name": "Solanum lycopersicum (hydroponic loop)",
        "default_stage": "fruiting",
        "stages": {
            "fruiting": {
                "vpd_target_kpa": (1.0, 1.4),
                "dli_target": 22,
                "temp_c": (21.0, 26.0),
                "soil_moisture_pct": (40.0, 50.0),
            }
        },
        "space_risks": [
            "Ethylene buildup during flowering",
            "Photosynthetic depression from high CO2",
        ],
    },
}


def get_crop_profile(crop_id: str = "potato") -> Dict[str, Any]:
    """Retrieve full biological profile for a given crop ID."""
    if crop_id not in PLANT_KNOWLEDGE_BASE:
        raise KeyError(
            f"Crop '{crop_id}' not found in PLANT_KNOWLEDGE_BASE. "
            f"Available crops: {list_crops()}"
        )
    return PLANT_KNOWLEDGE_BASE[crop_id]


def get_stage_targets(crop_id: str = "potato", stage: str = None) -> Dict[str, Any]:
    """Retrieve target metrics for a specific growth stage of a crop."""
    crop = get_crop_profile(crop_id)
    if stage is None:
        stage = crop.get("default_stage", list(crop["stages"].keys())[0])
    if stage not in crop["stages"]:
        raise KeyError(
            f"Stage '{stage}' not found for crop '{crop_id}'. "
            f"Available stages: {list(crop['stages'].keys())}"
        )
    return crop["stages"][stage]


def list_crops() -> List[str]:
    """List all registered crop identifiers."""
    return list(PLANT_KNOWLEDGE_BASE.keys())
