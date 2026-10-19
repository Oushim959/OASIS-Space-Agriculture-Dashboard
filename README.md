# O.A.S.I.S. (Orbital Adaptive Smart Irrigation & Sustenance)

[![Python 3.10+](https://img.shields.io/badge/python-3.10+-blue.svg)](https://www.python.org/downloads/)
[![React 19](https://img.shields.io/badge/React-19-61dafb.svg)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-7-646cff.svg)](https://vitejs.dev/)
[![Tests](https://img.shields.io/badge/tests-13%20passed-brightgreen.svg)]()
[![Model](https://img.shields.io/badge/LLM-openai%2Fgpt--oss--120b-orange.svg)](https://groq.com)
[![Safety](https://img.shields.io/badge/Safety-Deterministic%20Clamping-emerald.svg)]()
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688.svg)](https://fastapi.tiangolo.com)
[![License](https://img.shields.io/badge/license-MIT-lightgrey.svg)]()

> **LLM-Assisted Biophysical Closed-Loop Crop Control & Real-Time Simulation Dashboard for Space Habitats and Martian Agriculture.**

---

## 1. System Overview

**O.A.S.I.S.** is an autonomous closed-loop environmental control and mission visualization platform engineered for sealed extraterrestrial bio-regenerative life-support systems (BLSS), such as Martian surface domes, lunar habitats, and transit vessels.

Off-world farming requires delicate balancing: plant transpiration, root-zone moisture, light spectra, and heat rejection are tightly coupled. O.A.S.I.S. links high-dimensional sensor telemetry with large language model biological reasoning (powered by **Groq** and **`openai/gpt-oss-120b`**) while maintaining an **airtight deterministic safety supervisor** that inspects and clamps every proposed actuation vector before hardware execution.

```
       ┌────────────────────────────────────────────────────────┐
       │               Habitation Sensing Telemetry              │
       │  [Air Temp] [RH%] [Soil Moisture] [CO₂] [LED] [Reservoir]│
       └───────────────────────────┬────────────────────────────┘
                                   │
                                   ▼
       ┌────────────────────────────────────────────────────────┐
       │             Stage 1: Psychrometric Derivation           │
       │    Calculate Vapor Pressure Deficit (VPD via Tetens)    │
       └───────────────────────────┬────────────────────────────┘
                                   │
                                   ▼
       ┌────────────────────────────────────────────────────────┐
       │             Stage 2: LLM Biophysical Inference          │
       │    Groq (openai/gpt-oss-120b): Reasoning & Proposing    │
       │   • Irrigation (ml)          • Light Intensity (%)     │
       │   • R:B Spectrum Ratio       • Fan Ventilation (%)     │
       └───────────────────────────┬────────────────────────────┘
                                   │
                                   ▼
       ┌────────────────────────────────────────────────────────┐
       │             Stage 3: Deterministic Safety Guard         │
       │   • LED Overtemp Interlock (≥ 60 °C ──► Capped at 15%) │
       │   • Reservoir Interlock (< 5 % ──► Forced 0 ml)        │
       │   • Per-Cycle Dosing Ceiling (Capped at 150 ml)        │
       └───────────────────────────┬────────────────────────────┘
                                   │
                                   ▼
       ┌────────────────────────────────────────────────────────┐
       │              Stage 4: Hardware Actuators & SPA          │
       │  Pumps, LED Drivers, Fans + Live Mission Dashboard     │
       └────────────────────────────────────────────────────────┘
```

---

## 2. Core Architectural Pillars

### 1. Hard Deterministic Safety Rules
LLMs offer contextual biological reasoning across phenological stages, but mission-critical life support systems cannot trust probabilistic outputs with physical actuators. The deterministic safety supervisor enforces immutable physical constraints:
* **LED Thermal Protection (`led_overtemp`):** When LED array temperature reaches $\ge 60.0\,^\circ\text{C}$, lighting power is forced down to **$15\%$** to avert thermal runaway.
* **Cavitation / Dry-Pump Interlock (`dry_reservoir`):** If water reservoir level drops below **$5.0\%$**, irrigation volume is zeroed out to prevent pump impeller burnout.
* **Hypoxia / Over-Watering Ceiling (`irrigation_cap`):** Single-event irrigation cannot exceed **$150\,\text{ml}$** to avoid waterlogging and root-zone hypoxia in microgravity.

### 2. Psychrometric Physics (Tetens VPD Formula)
Transpiration potential is evaluated dynamically via saturation vapor pressure:
$$e_s(T) = 0.61078 \times \exp\left(\frac{17.27 \times T}{T + 237.3}\right)$$
$$\text{VPD} = e_s(T) \times \left(1 - \frac{\text{RH}}{100}\right)$$

### 3. Crop Knowledge Profiles
* **Martian Potato (*Solanum tuberosum*)**: Regolith substrate, tuber bulking stage, target VPD $0.8 - 1.2\,\text{kPa}$, target air temp $18 - 22\,^\circ\text{C}$, target soil moisture $35 - 45\%$.
* **Dwarf Tomato (*Solanum lycopersicum*)**: Hydroponic loop, fruiting stage, target VPD $1.0 - 1.4\,\text{kPa}$, target air temp $21 - 26\,^\circ\text{C}$, target root moisture $40 - 50\%$.

---

## 3. Web Mission Control Dashboard & Simulation Lab

The repository includes a modern web dashboard built with React 19, TypeScript, and Vite, featuring:

* **Interactive Botanical Stage**: Live sensor telemetry dials (Temperature, RH%, VPD, Moisture, CO₂, LED heat, Reservoir).
* **Live LLM Switcher**: Toggle between offline synthetic replay and live online inference with `openai/gpt-oss-120b` via Groq.
* **Model-to-Control Pipeline Visualizer**: Side-by-side comparison of **Recorded / Proposed (LLM)** vs. **Rule-Checked (Clamped)** actuation vectors.
* **Real-time LLM Reasoning Stream**: Complete biological and physical justification returned by the model for every decision.
* **Simulation Lab (On-Demand)**:
  - **Preset Scenarios**:
    1. *Optimal Conditions*: Baseline nominal envelope.
    2. *Heat Stress*: Elevating air temperatures above crop comfort zone.
    3. *Drought / Dry Media*: Critical moisture drop simulating irrigation loop failure.
    4. *LED Overtemperature*: Thermal excursion exceeding $60\,^\circ\text{C}$.
    5. *Empty Reservoir*: Storage depletion triggering dry-pump shutoff.
    6. *High $\text{CO}_2$*: Elevated carbon dioxide testing canopy transpiration response.
  - **Custom Sensors**: Interactive sliders to inject arbitrary telemetry values.
  - **Frame Timeline**: Expandable multi-step evaluation timeline with per-frame clamping badges and reasoning.
* **3D Habitat Visualizer**: Local glTF/GLB previewer for bio-dome CAD assets.

---

## 4. REST API Documentation

The FastAPI backend (`oasis.server`) exposes endpoints for headless systems, remote nodes, and frontend applications:

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/oasis/status` | System health, Groq API key presence, active model ID, and safety limits. |
| `GET` | `/api/oasis/crops` | Plant biological knowledge base and target parameters. |
| `GET` | `/api/oasis/telemetry` | Benchmark telemetry frames for specified crop. |
| `POST` | `/api/oasis/step` | Evaluates a single telemetry frame with LLM + safety clamping. |
| `POST` | `/api/oasis/stream` | Processes an entire telemetry dataset stream. |
| `GET` | `/api/oasis/scenarios` | Lists available on-demand simulation presets. |
| `POST` | `/api/oasis/simulate` | Executes multi-frame on-demand simulations with perturbation. |

---

## 5. Quickstart & Installation

### Prerequisites
* **Python 3.10+**
* **Node.js 18+** & **npm** / **pnpm**
* *(Optional)* A **Groq API Key** (if not provided, the system runs in deterministic Fallback Mode).

### 1. Clone & Configure
```bash
git clone https://github.com/Oushim959/OASIS-Space-Agriculture-Dashboard.git
cd OASIS-Space-Agriculture-Dashboard

# Create your local environment configuration
cp .env.example .env
# Edit .env and paste your GROQ_API_KEY
```

### 2. Python Environment Setup
```bash
# Install Python dependencies
pip install -r requirements.txt

# Run test suite to verify physics, pipeline, and safety clamp logic
pytest
```

### 3. Launching the System

#### Option A: Full-Stack Web Application (Recommended)

1. **Start the FastAPI Backend (Port 5000)**:
   ```bash
   python -m uvicorn oasis.server:app --host 0.0.0.0 --port 5000 --reload
   ```

2. **Start the React/Vite Frontend (Port 3000)**:
   ```bash
   cd artifacts/oasis-space-agriculture
   npm install
   npm run dev
   ```
   Open **`http://localhost:3000/dashboard`** to interact with the habitat dashboard and Simulation Lab.

*(Note: Production builds placed in `artifacts/oasis-space-agriculture/dist/public` are also automatically served directly by FastAPI at `http://localhost:5000/`)*.

#### Option B: Standalone Command-Line Interface (CLI)

Run the autonomous telemetry pipeline directly from the command line:
```bash
# Process Martian Potato telemetry with 8 frames
python main.py

# Target Dwarf Tomato in fruiting stage
python main.py --crop dwarf_tomato --stage fruiting

# Process custom frame count and export results to CSV
python main.py --crop potato --frames 4 --export-csv results.csv
```

#### Option C: Python Agent SDK

Import `OasisHabitatAgent` directly into your research workflows or notebooks:
```python
from agents import OasisHabitatAgent
from oasis.telemetry import load_or_create_dataset

# Initialize agent for Martian Potato cultivation
agent = OasisHabitatAgent(crop="potato", stage="tuber_bulking")

# Load telemetry dataset
df = load_or_create_dataset()

# Process a frame
frame = df.iloc[0].to_dict()
decision = agent.step(frame)

print("Calculated VPD:", decision["telemetry"]["calculated_vpd_kpa"])
print("Applied Actuation Vector:", decision["safe_vector"])
print("Deterministic Interventions:", decision["interventions"])
print("Model Reasoning:", decision["safe_vector"].get("reasoning"))
```

---

## 6. Testing

The suite includes 13 automated unit tests covering psychrometric physics, safety clamping limits, offline fallbacks, and agent lifecycle:

```bash
pytest
```

```text
tests/test_physics.py ....                                               [ 30%]
tests/test_pipeline.py ....                                              [ 61%]
tests/test_safety.py .....                                               [100%]

============================= 13 passed in ~5s ==============================
```

---

## 7. Repository Layout

```text
.
├── .env.example                               # Environment template for Groq API keys
├── .gitignore                                 # Ignore definitions for Python, Node, & secrets
├── README.md                                  # Project specification and documentation
├── requirements.txt                           # Python dependencies (FastAPI, Groq, Pytest, Pandas)
├── package.json                               # Monorepo configuration
├── main.py                                    # CLI execution entry point
├── agents.py                                  # High-level OasisHabitatAgent SDK
├── o-a-s-i-s.ipynb                            # Research & exploratory notebook
├── oasis/                                     # Core Python Package
│   ├── __init__.py                            # Public API exports
│   ├── config.py                              # Hard safety limits, constants, default vectors
│   ├── controller.py                          # Groq LLM integration & prompt engineering
│   ├── knowledge.py                           # Phenological crop profiles & space risk models
│   ├── physics.py                             # Psychrometric equations (Tetens formula for VPD)
│   ├── pipeline.py                            # 4-stage pipeline execution & summary tables
│   ├── safety.py                              # Deterministic safety rule clamping engine
│   ├── server.py                              # FastAPI backend & SPA static server
│   ├── telemetry.py                           # Martian sensor dataset generator & streaming
│   └── visualizer.py                          # Diagnostic Matplotlib generation tools
├── artifacts/oasis-space-agriculture/         # React / Vite Mission Control Frontend
│   ├── src/
│   │   ├── App.tsx                            # Dashboard, Simulation Lab & Mission Journal
│   │   ├── index.css                          # Design system & Simulation Lab styles
│   │   ├── components/                        # UI components & 3D ModelViewer
│   │   └── main.tsx                           # Application entry point
│   ├── vite.config.ts                         # Vite configuration with /api backend proxy
│   └── package.json                           # Frontend dependencies
├── static/                                    # Static demo assets
└── tests/                                     # Automated Test Suite
    ├── test_physics.py                        # Psychrometric & VPD calculation validation
    ├── test_safety.py                         # Thermal, dry-pump, and volume limit tests
    └── test_pipeline.py                       # Pipeline, offline fallback, & agent tests
```

---

## 8. License

This project is licensed under the MIT License — designed for advanced bio-regenerative life support research and off-world food production systems.
