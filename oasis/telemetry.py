"""
O.A.S.I.S. Telemetry Feed and Dataset Management.
Provides dataset persistence, synthetic stress-testing scenarios, and frame generators.
"""

from pathlib import Path
from typing import Generator, Union
import pandas as pd

from oasis.config import DEFAULT_DATA_PATH, TELEMETRY_COLUMNS


def generate_benchmark_telemetry() -> pd.DataFrame:
    """
    Generate synthetic Martian habitat greenhouse telemetry.
    Scripted over 8 sequential 15-minute frames to trigger specific safety edge cases:
      - Frames 1-2: Nominal baseline habitat conditions.
      - Frames 3-4: Thermal spike & humidity drop (high VPD). Frame 4 hits LED over-temp (63.5°C >= 60°C).
      - Frames 5-6: Normalization and stabilization.
      - Frames 7-8: Secondary stress event. Frame 8 hits critical reservoir depletion (3.5% < 5.0%).
    """
    return pd.DataFrame({
        "timestamp": pd.date_range("2026-10-12 00:00", periods=8, freq="15min"),
        "ambient_temp_c":        [20.1, 21.5, 24.8, 26.2, 21.0, 20.5, 23.0, 25.5],
        "relative_humidity_pct": [64.0, 58.0, 42.0, 38.0, 62.0, 65.0, 48.0, 40.0],
        "soil_moisture_pct":     [40.2, 35.0, 18.4, 15.0, 38.0, 41.0, 28.0, 16.0],
        "co2_ppm":               [950.0, 980.0, 940.0, 1100.0, 960.0, 950.0, 1020.0, 1150.0],
        "led_temp_c":            [38.0, 42.0, 52.0, 63.5, 39.0, 37.5, 58.0, 64.0],
        "reservoir_level_pct":   [80.0, 78.0, 75.0, 72.0, 70.0, 68.0, 65.0, 3.5],
    })


def load_or_create_dataset(path: Union[str, Path] = DEFAULT_DATA_PATH) -> pd.DataFrame:
    """
    Load telemetry CSV if exists; otherwise generate benchmark telemetry and write to disk.
    """
    path = Path(path)
    if path.exists():
        df = pd.read_csv(path, parse_dates=["timestamp"])
        return df

    df = generate_benchmark_telemetry()
    path.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(path, index=False)
    return df


def stream_frames(df: pd.DataFrame) -> Generator[dict, None, None]:
    """
    Yield telemetry frames row by row, simulating an asynchronous IoT/sensor bus stream.
    """
    for frame_id, (_, row) in enumerate(df.iterrows(), start=1):
        yield {
            "frame_id": frame_id,
            "timestamp": str(row["timestamp"]),
            **{col: float(row[col]) for col in TELEMETRY_COLUMNS if col in row},
        }
