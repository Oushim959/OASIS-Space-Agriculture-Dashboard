"""
O.A.S.I.S.: Orbital Adaptive Smart Irrigation & Sustenance
LLM-assisted crop control for closed-loop space habitats.
"""

from oasis.config import (
    __version__,
    SAFETY_LIMITS,
    RULE_LABELS,
    FALLBACK_VECTOR,
    DEFAULT_MODEL_ID,
    TELEMETRY_COLUMNS,
    DEFAULT_DATA_PATH,
    DEFAULT_CONDITIONS_PLOT,
    DEFAULT_CONTROLLER_PLOT,
    DEFAULT_RESPONSE_PLOT,
)
from oasis.physics import (
    calculate_vpd,
    calculate_saturation_vapor_pressure,
)
from oasis.knowledge import (
    PLANT_KNOWLEDGE_BASE,
    get_crop_profile,
    get_stage_targets,
    list_crops,
)
from oasis.safety import apply_safety_limits
from oasis.controller import (
    get_groq_client,
    query_controller,
    parse_vector,
)
from oasis.telemetry import (
    load_or_create_dataset,
    generate_benchmark_telemetry,
    stream_frames,
)
from oasis.pipeline import (
    process_frame,
    run_pipeline,
    build_results_table,
    build_summary_table,
)
from oasis.visualizer import (
    plot_conditions,
    plot_controller_output,
    plot_response_check,
    generate_all_plots,
)

__all__ = [
    "__version__",
    "SAFETY_LIMITS",
    "RULE_LABELS",
    "FALLBACK_VECTOR",
    "DEFAULT_MODEL_ID",
    "TELEMETRY_COLUMNS",
    "DEFAULT_DATA_PATH",
    "DEFAULT_CONDITIONS_PLOT",
    "DEFAULT_CONTROLLER_PLOT",
    "DEFAULT_RESPONSE_PLOT",
    "calculate_vpd",
    "calculate_saturation_vapor_pressure",
    "PLANT_KNOWLEDGE_BASE",
    "get_crop_profile",
    "get_stage_targets",
    "list_crops",
    "apply_safety_limits",
    "get_groq_client",
    "query_controller",
    "parse_vector",
    "load_or_create_dataset",
    "generate_benchmark_telemetry",
    "stream_frames",
    "process_frame",
    "run_pipeline",
    "build_results_table",
    "build_summary_table",
    "plot_conditions",
    "plot_controller_output",
    "plot_response_check",
    "generate_all_plots",
]
