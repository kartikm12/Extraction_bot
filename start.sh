#!/usr/bin/env bash
set -e

echo "========================================================"
echo "Starting Tender Analysis and Extraction Bot"
echo "========================================================"

mkdir -p storage/uploads storage/reports storage/logs

echo "Starting server on http://localhost:8000 ..."
python -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload
