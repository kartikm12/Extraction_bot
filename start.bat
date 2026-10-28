@echo off
echo ========================================================
echo Starting Tender Analysis and Extraction Bot
echo ========================================================

:: Check Python installation
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Error: Python is not installed or not in PATH.
    pause
    exit /b 1
)

:: Create directories
if not exist "storage\uploads" mkdir "storage\uploads"
if not exist "storage\reports" mkdir "storage\reports"
if not exist "storage\logs" mkdir "storage\logs"

echo Starting server on http://localhost:8000 ...
python -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload
pause
