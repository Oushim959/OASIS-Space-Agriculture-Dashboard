#!/usr/bin/env python3
"""
O.A.S.I.S.: Orbital Adaptive Smart Irrigation & Sustenance
Main Command-Line Interface and Execution Entry Point.

Example Usage:
  python main.py
  python main.py --crop potato --stage tuber_bulking --frames 8
  python main.py --crop dwarf_tomato --stage fruiting
  python main.py --export-csv results_export.csv
"""

import argparse
import os
import sys
import textwrap
from pathlib import Path
from tabulate import tabulate

from oasis import (
    __version__,
    DEFAULT_DATA_PATH,
    DEFAULT_MODEL_ID,
    PLANT_KNOWLEDGE_BASE,
    build_results_table,
    build_summary_table,
    generate_all_plots,
    get_groq_client,
    list_crops,
    load_or_create_dataset,
    run_pipeline,
)

# Ensure safe UTF-8 output on Windows terminals
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")


def print_banner():
    banner = f"""
================================================================================
   ___        _       ____     ___     ____  
  / _ \\      / \\     / ___|   |_ _|   / ___| 
 | | | |    / _ \\    \\___ \\    | |    \\___ \\ 
 | |_| |   / ___ \\    ___) |   | |     ___) |
  \\___/   /_/   \\_\\  |____/   |___|   |____/ 
                                             
  Orbital Adaptive Smart Irrigation & Sustenance (v{__version__})
  LLM-Assisted Biophysical Crop Control for Closed-Loop Space Habitats
================================================================================
"""
    print(banner)


def parse_args():
    parser = argparse.ArgumentParser(
        description="O.A.S.I.S. Space Habitat Crop Controller & Telemetry Pipeline",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    )
    parser.add_argument(
        "--crop",
        type=str,
        default="potato",
        choices=list_crops(),
        help="Target crop identifier in knowledge base",
    )
    parser.add_argument(
        "--stage",
        type=str,
        default=None,
        help="Growth stage (e.g. tuber_bulking, fruiting). Defaults to crop's standard stage.",
    )
    parser.add_argument(
        "--csv",
        type=str,
        default=str(DEFAULT_DATA_PATH),
        help="Path to telemetry CSV file (auto-generated if missing)",
    )
    parser.add_argument(
        "--frames",
        type=int,
        default=None,
        help="Maximum number of telemetry frames to process (default: all)",
    )
    parser.add_argument(
        "--model",
        type=str,
        default=DEFAULT_MODEL_ID,
        help="Groq LLM model identifier for actuation inference",
    )
    parser.add_argument(
        "--no-plots",
        action="store_true",
        help="Skip generating PNG diagnostic charts",
    )
    parser.add_argument(
        "--show-plots",
        action="store_true",
        help="Display interactive matplotlib chart windows",
    )
    parser.add_argument(
        "--export-csv",
        type=str,
        default=None,
        help="Optional path to export full processed results table as CSV",
    )
    parser.add_argument(
        "--serve",
        action="store_true",
        help="Start the O.A.S.I.S. API backend server for the web dashboard",
    )
    parser.add_argument(
        "--port",
        type=int,
        default=5000,
        help="Port to run API backend server on (default: 5000)",
    )
    return parser.parse_args()


def main():
    print_banner()
    args = parse_args()

    if args.serve:
        from oasis.server import start_server
        start_server(port=args.port)
        return

    crop_id = args.crop
    crop_info = PLANT_KNOWLEDGE_BASE[crop_id]
    stage = args.stage or crop_info.get("default_stage", list(crop_info["stages"].keys())[0])

    print(f"[*] Target Bio-System: {crop_info['display_name']}")
    print(f"[*] Phenological Stage: {stage.upper()}")
    print(f"[*] Telemetry Source:   {args.csv}")

    # Check Groq API Key
    client = get_groq_client()
    if client:
        print(f"[OK] Groq API client connected. Model: {args.model}")
    else:
        print("[!] NOTICE: No GROQ_API_KEY detected.")
        print("    The controller will operate in safe FALLBACK mode (preset vectors & safety limits).")
        print("    To enable live LLM reasoning, add GROQ_API_KEY to a .env file or environment.")

    # Ingest / generate dataset
    print("\n[*] Loading telemetry feed...")
    df = load_or_create_dataset(args.csv)
    total_available = len(df)
    run_count = min(args.frames, total_available) if args.frames else total_available
    print(f"[OK] Ingested {total_available} telemetry frames. Processing {run_count} frame(s)...")

    # Run execution pipeline
    records = run_pipeline(
        df=df,
        crop_id=crop_id,
        stage=stage,
        max_frames=args.frames,
        model_id=args.model,
        client=client,
    )
    results = build_results_table(records)

    # Print summary table
    summary_df = build_summary_table(results)
    print("\n" + "=" * 80)
    print("  TELEMETRY & ACTUATION CONTROL SUMMARY")
    print("  Note: Where safety limits intervened, values appear as 'proposed -> applied'")
    print("=" * 80)
    try:
        print(tabulate(summary_df, headers="keys", tablefmt="grid"))
    except Exception:
        print(summary_df.to_string())

    # Print model reasoning per frame
    print("\n" + "=" * 80)
    print("  CONTROLLER REASONING LOG")
    print("=" * 80)
    for _, row in results.iterrows():
        time_str = row["time"].strftime("%H:%M")
        src_tag = f"[{row['source'].upper()}]"
        print(f"\n>> Frame {row['frame_id']} ({time_str}) {src_tag}:")
        reasoning_text = textwrap.fill(
            row["reasoning"],
            width=88,
            initial_indent="   ",
            subsequent_indent="   ",
        )
        print(reasoning_text)
        if row["interventions"]:
            print(f"   [!] Safety Interventions: {', '.join(row['interventions'])}")

    # Export CSV if requested
    if args.export_csv:
        export_path = Path(args.export_csv)
        export_path.parent.mkdir(parents=True, exist_ok=True)
        results.to_csv(export_path, index=False)
        print(f"\n[OK] Detailed results exported to: {export_path.resolve()}")

    # Generate visual diagnostics
    if not args.no_plots:
        print("\n[*] Generating high-resolution diagnostic charts...")
        chart_paths = generate_all_plots(
            results=results,
            crop_id=crop_id,
            stage=stage,
            model_id=args.model,
        )
        for p in chart_paths:
            print(f"   [Chart Saved] {p.resolve()}")

    print("\n[OK] O.A.S.I.S. bio-habitat control cycle completed successfully.\n")


if __name__ == "__main__":
    main()
