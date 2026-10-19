"""
O.A.S.I.S. Visualization Engine.
Generates publication-grade diagnostics and telemetry plots:
  1. Habitat Conditions with biological target bands and safety ceilings/floors.
  2. Actuator Vector Comparison (Proposed vs. Applied Clamped).
  3. Proportional Response Sanity Check.
"""

from pathlib import Path
from typing import List, Optional, Tuple, Union
import matplotlib.dates as mdates
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd

from oasis.config import (
    DEFAULT_CONDITIONS_PLOT,
    DEFAULT_CONTROLLER_PLOT,
    DEFAULT_RESPONSE_PLOT,
    RULE_LABELS,
    SAFETY_LIMITS,
)
from oasis.knowledge import PLANT_KNOWLEDGE_BASE

# Color Palette
C_LINE = "#2b6f8f"  # Teal Blue - Nominal
C_BAD = "#d1495b"   # Crimson - Alert / Intervention
C_BAND = "#2a9d8f"  # Emerald - Biological Target Range
C_RAW = "#8d99ae"   # Cool Grey - Proposed Raw Value
C_INK = "#2b2d42"   # Dark Charcoal - Typography

CHART_RC_PARAMS = {
    "figure.facecolor": "white",
    "axes.facecolor": "white",
    "axes.edgecolor": "#b8bcc6",
    "axes.labelcolor": C_INK,
    "axes.spines.top": False,
    "axes.spines.right": False,
    "axes.grid": True,
    "grid.color": "#e8eaef",
    "grid.linewidth": 0.8,
    "xtick.color": C_INK,
    "ytick.color": C_INK,
    "font.size": 10,
    "axes.titlesize": 11,
    "axes.titleweight": "bold",
    "axes.titlelocation": "left",
}


def _frame_half_width(results: pd.DataFrame) -> pd.Timedelta:
    """Half the spacing between frames, used to shade a frame's time slot."""
    if len(results) < 2:
        return pd.Timedelta(minutes=7)
    return results["time"].diff().median() / 2


def _shade_interventions(ax, results: pd.DataFrame, half: pd.Timedelta):
    """Shade time slots where safety rules intervened."""
    for t in results.loc[results["interventions"].map(bool), "time"]:
        ax.axvspan(t - half, t + half, color=C_BAD, alpha=0.08, lw=0)


def _build_subtitle(results: pd.DataFrame, crop_id: str, stage: str, model_id: str) -> str:
    n_fallback = int((results["source"] == "fallback").sum())
    display_name = PLANT_KNOWLEDGE_BASE.get(crop_id, {}).get("display_name", crop_id)
    text = f"{display_name}  ·  {stage.replace('_', ' ')}  ·  {len(results)} frames  ·  {model_id}"
    if n_fallback:
        text += f"  ·  {n_fallback} fallback frame(s)"
    return text


def plot_conditions(
    results: pd.DataFrame,
    crop_id: str = "potato",
    stage: str = "tuber_bulking",
    model_id: str = "openai/gpt-oss-120b",
    output_path: Union[str, Path] = DEFAULT_CONDITIONS_PLOT,
    show: bool = False,
) -> Path:
    """Plot multi-panel habitat condition telemetry with target bands and limits."""
    plt.rcParams.update(CHART_RC_PARAMS)

    crop_data = PLANT_KNOWLEDGE_BASE.get(crop_id, PLANT_KNOWLEDGE_BASE["potato"])
    targets = crop_data["stages"].get(stage, list(crop_data["stages"].values())[0])

    panels = [
        dict(col="temp_c",        title="Air temperature",         unit="°C",  band=targets.get("temp_c")),
        dict(col="rh_pct",        title="Relative humidity",       unit="%"),
        dict(col="vpd_kpa",       title="Vapor pressure deficit",  unit="kPa", band=targets.get("vpd_target_kpa")),
        dict(col="soil_pct",      title="Substrate moisture",      unit="%",   band=targets.get("soil_moisture_pct")),
        dict(col="co2_ppm",       title="CO₂ concentration",       unit="ppm"),
        dict(col="led_temp_c",    title="LED array temperature",   unit="°C",  ceiling=SAFETY_LIMITS["max_led_temp_c"]),
        dict(col="reservoir_pct", title="Water reservoir level",   unit="%",   floor=SAFETY_LIMITS["min_reservoir_pct"]),
    ]

    half = _frame_half_width(results)
    fig, axes = plt.subplots(4, 2, figsize=(13, 12), sharex=True)
    flat_axes = axes.ravel()

    for ax, p in zip(flat_axes, panels):
        y = results[p["col"]]
        outside = pd.Series(False, index=y.index)
        yaxis_tf = ax.get_yaxis_transform()

        if "band" in p and p["band"]:
            lo, hi = p["band"]
            ax.axhspan(lo, hi, color=C_BAND, alpha=0.15, lw=0)
            ax.text(0.99, hi, f"target {lo:g}–{hi:g}", transform=yaxis_tf, ha="right", va="bottom", fontsize=8.5, color=C_BAND)
            outside = (y < lo) | (y > hi)
        if "ceiling" in p:
            ax.axhline(p["ceiling"], color=C_BAD, ls="--", lw=1.2)
            ax.text(0.01, p["ceiling"], f"limit {p['ceiling']:g} {p['unit']}", transform=yaxis_tf, ha="left", va="bottom", fontsize=8.5, color=C_BAD)
            outside = y >= p["ceiling"]
        if "floor" in p:
            ax.axhline(p["floor"], color=C_BAD, ls="--", lw=1.2)
            ax.text(0.01, p["floor"], f"minimum {p['floor']:g} {p['unit']}", transform=yaxis_tf, ha="left", va="bottom", fontsize=8.5, color=C_BAD)
            outside = y < p["floor"]

        _shade_interventions(ax, results, half)
        ax.plot(results["time"], y, color=C_LINE, lw=1.8, zorder=2)
        ax.scatter(results["time"], y, c=np.where(outside, C_BAD, C_LINE), s=38, zorder=3, edgecolor="white", linewidth=0.8)
        ax.set_title(p["title"])
        ax.set_ylabel(p["unit"])
        ax.margins(y=0.2)

    # Panel 8: Safety intervention timeline
    ax = flat_axes[7]
    rules = list(RULE_LABELS)
    _shade_interventions(ax, results, half)
    ax.grid(axis="y", visible=False)
    for i, rule in enumerate(rules):
        ax.axhline(i, color="#e8eaef", lw=1, zorder=1)
        times = results.loc[results["interventions"].map(lambda r: rule in r), "time"]
        ax.scatter(times, [i] * len(times), marker="s", s=90, color=C_BAD, zorder=3)
    ax.set_yticks(range(len(rules)))
    ax.set_yticklabels([RULE_LABELS[r] for r in rules])
    ax.set_ylim(-0.6, len(rules) - 0.4)
    ax.set_title("Safety interventions")
    if not results["interventions"].map(bool).any():
        ax.text(0.5, 0.5, "none triggered", transform=ax.transAxes, ha="center", va="center", color=C_RAW)

    flat_axes[0].set_xlim(results["time"].min() - half * 1.5, results["time"].max() + half * 1.5)
    for ax in flat_axes[-2:]:
        ax.xaxis.set_major_formatter(mdates.DateFormatter("%H:%M"))
        ax.set_xlabel(f"Time on {results['time'].iloc[0]:%Y-%m-%d}")

    handles = [
        plt.Line2D([], [], color=C_LINE, marker="o", ls="", ms=7, label="Within target"),
        plt.Line2D([], [], color=C_BAD, marker="o", ls="", ms=7, label="Outside target or past a limit"),
        plt.Rectangle((0, 0), 1, 1, color=C_BAD, alpha=0.15, lw=0, label="Safety rule fired in this frame"),
    ]
    fig.legend(handles=handles, loc="lower center", ncol=3, frameon=False)
    fig.suptitle("Habitat conditions", fontsize=15, fontweight="bold", x=0.01, ha="left", y=0.995)
    fig.text(0.01, 0.962, _build_subtitle(results, crop_id, stage, model_id), fontsize=9.5, color="#555b6e", ha="left")
    fig.tight_layout(rect=(0, 0.04, 1, 0.95))

    out = Path(output_path)
    out.parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(out, dpi=150, bbox_inches="tight")
    if show:
        plt.show()
    plt.close(fig)
    return out


def plot_controller_output(
    results: pd.DataFrame,
    crop_id: str = "potato",
    stage: str = "tuber_bulking",
    model_id: str = "openai/gpt-oss-120b",
    output_path: Union[str, Path] = DEFAULT_CONTROLLER_PLOT,
    show: bool = False,
) -> Path:
    """Plot proposed control vector vs applied vector after safety limits."""
    plt.rcParams.update(CHART_RC_PARAMS)

    specs = [
        dict(key="irrigation", title="Irrigation volume", unit="ml", ylim=(0, 165), cap=SAFETY_LIMITS["max_irrigation_ml"]),
        dict(key="light", title="Light intensity", unit="%", ylim=(0, 105)),
        dict(key="fan", title="Ventilation fan duty", unit="%", ylim=(0, 105)),
        dict(key="rb", title="Light spectrum (red : blue)", unit="ratio", ylim=None),
    ]

    half = _frame_half_width(results)
    fig, axes = plt.subplots(2, 2, figsize=(13, 7), sharex=True)

    for ax, s in zip(axes.ravel(), specs):
        raw, applied, t = results[f"{s['key']}_raw"], results[s["key"]], results["time"]

        _shade_interventions(ax, results, half)
        if "cap" in s:
            ax.axhline(s["cap"], color=C_BAD, ls="--", lw=1.2)
            ax.text(0.01, s["cap"], f"cap {s['cap']} {s['unit']}", transform=ax.get_yaxis_transform(),
                    ha="left", va="bottom", fontsize=8.5, color=C_BAD)

        ax.plot(t, raw, color=C_RAW, ls=":", lw=1.2, marker="o", ms=9, mfc="white", mec=C_RAW, mew=1.6, zorder=2)
        ax.plot(t, applied, color=C_LINE, lw=2, marker="o", ms=5, zorder=3)

        diff = raw != applied
        ax.vlines(t[diff], applied[diff], raw[diff], color=C_BAD, lw=3, zorder=2)
        for ti, a in zip(t[diff], applied[diff]):
            ax.annotate(f"{a:g}", (ti, a), textcoords="offset points", xytext=(9, -3),
                        fontsize=9, fontweight="bold", color=C_BAD)

        ax.set_title(s["title"])
        ax.set_ylabel(s["unit"])
        if s["ylim"]:
            top = max(s["ylim"][1], raw.max() * 1.08)
            ax.set_ylim(s["ylim"][0], top)
        else:
            ax.margins(y=0.25)

    axes[0, 0].set_xlim(results["time"].min() - half * 1.5, results["time"].max() + half * 1.5)
    for ax in axes[-1]:
        ax.xaxis.set_major_formatter(mdates.DateFormatter("%H:%M"))
        ax.set_xlabel(f"Time on {results['time'].iloc[0]:%Y-%m-%d}")

    handles = [
        plt.Line2D([], [], color=C_RAW, ls=":", marker="o", mfc="white", ms=9, mew=1.6, label="Proposed by model"),
        plt.Line2D([], [], color=C_LINE, marker="o", ms=5, lw=2, label="Applied after safety limits"),
        plt.Line2D([], [], color=C_BAD, lw=3, label="Reduced by a safety rule"),
    ]
    fig.legend(handles=handles, loc="lower center", ncol=3, frameon=False)
    fig.suptitle("Control vector: proposed vs. applied", fontsize=15, fontweight="bold", x=0.01, ha="left", y=0.995)
    fig.text(0.01, 0.945, _build_subtitle(results, crop_id, stage, model_id), fontsize=9.5, color="#555b6e", ha="left")
    fig.tight_layout(rect=(0, 0.05, 1, 0.93))

    out = Path(output_path)
    out.parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(out, dpi=150, bbox_inches="tight")
    if show:
        plt.show()
    plt.close(fig)
    return out


def plot_response_check(
    results: pd.DataFrame,
    crop_id: str = "potato",
    stage: str = "tuber_bulking",
    output_path: Union[str, Path] = DEFAULT_RESPONSE_PLOT,
    show: bool = False,
) -> Path:
    """Plot response linearity check (water vs moisture deficit, fan vs VPD excess)."""
    plt.rcParams.update(CHART_RC_PARAMS)

    crop_data = PLANT_KNOWLEDGE_BASE.get(crop_id, PLANT_KNOWLEDGE_BASE["potato"])
    targets = crop_data["stages"].get(stage, list(crop_data["stages"].values())[0])

    soil_lo, soil_hi = targets.get("soil_moisture_pct", (35, 45))
    soil_mid = (soil_lo + soil_hi) / 2
    vpd_hi = targets.get("vpd_target_kpa", (0.8, 1.2))[1]

    panels = [
        dict(
            x=(soil_mid - results["soil_pct"]).clip(lower=0),
            y=results["irrigation_raw"],
            xlabel=f"Moisture below target midpoint ({soil_mid:g}%), percentage points",
            ylabel="Irrigation proposed (ml)",
            title="Water vs. moisture deficit",
        ),
        dict(
            x=(results["vpd_kpa"] - vpd_hi).clip(lower=0),
            y=results["fan_raw"],
            xlabel=f"VPD above target ceiling ({vpd_hi:g} kPa), kPa",
            ylabel="Fan duty proposed (%)",
            title="Ventilation vs. VPD excess",
        ),
    ]

    fig, axes = plt.subplots(1, 2, figsize=(13, 4.8))
    for ax, p in zip(axes, panels):
        ax.scatter(p["x"], p["y"], s=80, color=C_LINE, edgecolor="white", linewidth=1, zorder=3)
        groups = {}
        for fid, xi, yi in zip(results["frame_id"], p["x"], p["y"]):
            groups.setdefault((xi, yi), []).append(str(fid))
        for (xi, yi), ids in groups.items():
            ax.annotate(", ".join(ids), (xi, yi), textcoords="offset points", xytext=(7, 5), fontsize=9, color=C_INK)
        if p["x"].nunique() > 1 and p["y"].nunique() > 1:
            slope, intercept = np.polyfit(p["x"], p["y"], 1)
            xs = np.array([p["x"].min(), p["x"].max()])
            ax.plot(xs, slope * xs + intercept, color=C_RAW, ls="--", lw=1.4, zorder=2)
        ax.set_xlabel(p["xlabel"])
        ax.set_ylabel(p["ylabel"])
        ax.set_title(p["title"])
        ax.margins(0.15)
        ax.set_xlim(left=-0.04 * max(p["x"].max(), 1e-9))

    fig.suptitle("Is the response proportional to the need?", fontsize=15, fontweight="bold", x=0.01, ha="left", y=1.02)
    fig.tight_layout()

    out = Path(output_path)
    out.parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(out, dpi=150, bbox_inches="tight")
    if show:
        plt.show()
    plt.close(fig)
    return out


def generate_all_plots(
    results: pd.DataFrame,
    crop_id: str = "potato",
    stage: str = "tuber_bulking",
    model_id: str = "openai/gpt-oss-120b",
    output_dir: Union[str, Path] = ".",
) -> List[Path]:
    """Generate all three diagnostic charts and save to specified directory."""
    out_dir = Path(output_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    p1 = plot_conditions(
        results, crop_id=crop_id, stage=stage, model_id=model_id,
        output_path=out_dir / DEFAULT_CONDITIONS_PLOT
    )
    p2 = plot_controller_output(
        results, crop_id=crop_id, stage=stage, model_id=model_id,
        output_path=out_dir / DEFAULT_CONTROLLER_PLOT
    )
    p3 = plot_response_check(
        results, crop_id=crop_id, stage=stage,
        output_path=out_dir / DEFAULT_RESPONSE_PLOT
    )
    return [p1, p2, p3]
