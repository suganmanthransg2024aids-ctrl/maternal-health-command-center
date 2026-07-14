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

REM ── Step 1: Check Node.js ─────────────────────────────────────────────────
echo  [1/3] Checking Node.js installation...
where node >nul 2>&1
if errorlevel 1 (
    echo.
    echo   ERROR: Node.js is not installed or not in PATH.
    echo.
    echo   Please download and install Node.js 18 or higher from:
    echo     https://nodejs.org/
    echo.
    pause
    exit /b 1
)
for /f "tokens=*" %%v in ('node --version 2^>^&1') do echo    Found: Node.js %%v
echo.

REM ── Step 2: Install packages ──────────────────────────────────────────────
echo  [2/3] Installing backend packages...
call npm install --no-fund --no-audit
if errorlevel 1 (
    echo    ERROR: Package installation failed.
    echo    Check your internet connection and try again.
    pause
    exit /b 1
)
echo    All packages installed successfully.
echo.

REM ── Step 3: Verify Excel path ─────────────────────────────────────────────
echo  [3/3] Verifying Excel database...
node -e "const c=require('./config.json'); const fs=require('fs'); const exists=fs.existsSync(c.excel_path); console.log('   Path :', c.excel_path); console.log('   Found:', exists ? 'YES - Ready to use' : 'NO  - Please update config.json');"
echo.

echo  ==========================================================
echo    SETUP COMPLETE
echo.
echo    To start the application, run:  start.bat
echo    To stop  the application, run:  STOP_CCMC.bat
echo.
echo    If the Excel path above shows NO, open config.json
echo    and update the "excel_path" to your actual file location.
echo  ==========================================================
echo.
pause
