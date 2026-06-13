@echo off
setlocal
title CCMC Setup - First Time Installation
color 0B

echo.
echo  ==========================================================
echo    CCMC MATERNAL HEALTH TRACKER  ^|  SETUP
echo    Coimbatore City Municipal Corporation
echo    Government of Tamil Nadu
echo  ==========================================================
echo.

cd /d "%~dp0"

REM ── Step 1: Check Python ──────────────────────────────────────────────────
echo  [1/4] Checking Python installation...
where python >nul 2>&1
if errorlevel 1 (
    echo.
    echo   ERROR: Python is not installed or not in PATH.
    echo.
    echo   Please download and install Python 3.8 or higher from:
    echo     https://www.python.org/downloads/
    echo.
    echo   IMPORTANT: During installation, check the box:
    echo     "Add Python to PATH"
    echo.
    pause
    exit /b 1
)
for /f "tokens=*" %%v in ('python --version 2^>^&1') do echo    Found: %%v
echo.

REM ── Step 2: Create virtual environment ───────────────────────────────────
echo  [2/4] Setting up virtual environment...
if exist "venv\Scripts\activate.bat" (
    echo    Virtual environment already exists. Skipping creation.
) else (
    python -m venv venv
    if errorlevel 1 (
        echo    ERROR: Could not create virtual environment.
        pause
        exit /b 1
    )
    echo    Virtual environment created successfully.
)
call venv\Scripts\activate.bat
echo.

REM ── Step 3: Install packages ──────────────────────────────────────────────
echo  [3/4] Installing Python packages...
python -m pip install --upgrade pip --quiet
pip install -r backend_maternal\requirements.txt
if errorlevel 1 (
    echo    ERROR: Package installation failed.
    echo    Check your internet connection and try again.
    pause
    exit /b 1
)
echo    All packages installed successfully.
echo.

REM ── Step 4: Verify Excel path ─────────────────────────────────────────────
echo  [4/4] Verifying Excel database...
python -c "import json,os; c=json.load(open('config.json')); p=c['excel_path']; exists=os.path.exists(p); print('   Path :', p); print('   Found:', 'YES - Ready to use' if exists else 'NO  - Please update config.json')"
echo.

echo  ==========================================================
echo    SETUP COMPLETE
echo.
echo    To start the application, run:  START_CCMC.bat
echo    To stop  the application, run:  STOP_CCMC.bat
echo.
echo    If the Excel path above shows NO, open config.json
echo    and update the "excel_path" to your actual file location.
echo  ==========================================================
echo.
pause
