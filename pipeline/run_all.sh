#!/bin/bash
set -e

echo "Starting full redistricting data pipeline..."

# Ensure we are in the correct directory
cd "$(dirname "$0")"

# 1. Download and standardise all 50 states from MGGG
echo "=========================================="
echo "STEP 1: DOWNLOADING & STANDARDIZING SHAPEFILES"
echo "=========================================="
./venv/bin/python download_mggg.py

# 2. Run GerryChain optimisations for all states
echo "=========================================="
echo "STEP 2: GENERATING MAPS AND METRICS"
echo "=========================================="
./venv/bin/python generate_maps.py --states all

echo "=========================================="
echo "PIPELINE COMPLETE!"
echo "All files have been saved to public/data/"
echo "=========================================="
