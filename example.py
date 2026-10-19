"""
Example script demonstrating how to use OasisHabitatAgent.
Run this directly from terminal:
    python example.py
"""

import sys

# Ensure UTF-8 output on Windows terminals
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

from agents import OasisHabitatAgent
from oasis.telemetry import load_or_create_dataset

# Initialize agent for Martian Potato
agent = OasisHabitatAgent(crop="potato", stage="tuber_bulking")

# Load telemetry dataset
df = load_or_create_dataset()

# Run a single frame
frame = df.iloc[0].to_dict()
decision = agent.step(frame)

print("\n--- SINGLE FRAME RESULT ---")
print("VPD (kPa):", decision["telemetry"]["calculated_vpd_kpa"])
print("Applied Vector:", decision["safe_vector"])
print("Interventions:", decision["interventions"])
print("LLM Reasoning:", decision["safe_vector"].get("reasoning", ""))
