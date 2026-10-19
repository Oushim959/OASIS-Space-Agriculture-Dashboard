"""
Unit tests for O.A.S.I.S. controller parsing and telemetry pipeline.
"""

from oasis.controller import parse_vector
from oasis.telemetry import generate_benchmark_telemetry
from oasis.pipeline import run_pipeline, build_results_table, build_summary_table


def test_parse_vector_clean():
    json_str = """
    {
      "target_irrigation_ml": 80,
      "light_spectrum_ratio_r_b": 4.2,
      "light_intensity_pct": 75,
      "ventilation_fan_duty": 55,
      "reasoning": "Standard vegetative lighting and hydration."
    }
    """
    res = parse_vector(json_str)
    assert res["target_irrigation_ml"] == 80
    assert res["light_spectrum_ratio_r_b"] == 4.2
    assert res["light_intensity_pct"] == 75
    assert res["ventilation_fan_duty"] == 55
    assert "Standard" in res["reasoning"]


def test_parse_vector_markdown_codeblock():
    raw = """
    Here is the actuation vector:
    ```json
    {
      "target_irrigation_ml": "110",
      "light_spectrum_ratio_r_b": 5.0,
      "light_intensity_pct": "85.2",
      "ventilation_fan_duty": 90,
      "reasoning": "Elevated VPD counter-measure."
    }
    ```
    """
    res = parse_vector(raw)
    assert res["target_irrigation_ml"] == 110
    assert res["light_intensity_pct"] == 85
    assert res["ventilation_fan_duty"] == 90


def test_pipeline_offline_fallback(monkeypatch):
    monkeypatch.delenv("GROQ_API_KEY", raising=False)
    df = generate_benchmark_telemetry()
    # When no client is passed and no key is set, it executes in fallback mode
    records = run_pipeline(df, crop_id="potato", stage="tuber_bulking", max_frames=3, client=None)
    assert len(records) == 3

    results = build_results_table(records)
    assert len(results) == 3
    assert "vpd_kpa" in results.columns
    assert "source" in results.columns
    assert (results["source"] == "fallback").all()

    summary = build_summary_table(results)
    assert len(summary) == 3


def test_habitat_agent_execution():
    from agents import OasisHabitatAgent
    agent = OasisHabitatAgent(crop="potato", stage="tuber_bulking")
    df = generate_benchmark_telemetry()
    records = agent.run_dataframe(df, max_frames=2)
    assert len(records) == 2
    assert "safe_vector" in records[0]
    assert records[0]["step"] == 1
