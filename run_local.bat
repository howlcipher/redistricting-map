@echo off
:: RedrawUS Launcher for Windows

echo ==================================================
echo       RedrawUS Local Server Launcher
echo ==================================================
echo Starting local Python HTTP server on port 8000...

:: Open the default browser to the web app address
start http://localhost:8000

:: Run the Python server (checks for python3, falls back to python)
python -m http.server 8000 || python3 -m http.server 8000

if %errorlevel% neq 0 (
    echo.
    echo ERROR: Python is not installed or not in your system PATH.
    echo Please install Python from https://www.python.org/downloads/
    echo.
    pause
)
