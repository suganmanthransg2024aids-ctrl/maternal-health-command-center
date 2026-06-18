@echo off
setlocal enabledelayedexpansion
title CCMC Maternal Health Tracker
color 0A

echo.
echo  ============================================================
echo    CCMC MATERNAL HEALTH TRACKER
echo    Coimbatore City Municipal Corporation
echo    Government of Tamil Nadu
echo  ============================================================
echo.

cd /d "%~dp0"

REM ── Kill any existing process on port 8001 ───────────────────────────────
echo  Clearing port 8001...
for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr ":8001 " ^| findstr "LISTENING"') do (
    taskkill /F /PID %%a >nul 2>&1
)
timeout /t 2 /nobreak >nul

REM ── Activate venv if present ─────────────────────────────────────────────
if exist "venv\Scripts\activate.bat" (
    call venv\Scripts\activate.bat
)

REM ── Launch server in its own persistent window ────────────────────────────
echo  Starting CCMC server in background window...
set EXCEL_URL=https://docs.google.com/spreadsheets/d/1T1sthQZftwJEyve2wuyAwVZ55sr8TvgwhQJFEdEmAmA/export?format=xlsx
set PORT=8001
set PYTHONUNBUFFERED=1
start "CCMC Server (keep open)" /MIN cmd /k "set EXCEL_URL=%EXCEL_URL%&& set PORT=8001&& set PYTHONUNBUFFERED=1&& python backend_maternal\app.py"

REM ── Wait for server using PowerShell health check ────────────────────────
echo.
echo  Waiting for database to load from Google Sheets...
echo  (This takes 15-30 seconds on first start)
echo.

set READY=0
for /L %%i in (1,1,40) do (
    if !READY!==0 (
        powershell -NoProfile -Command "try{$null=Invoke-WebRequest 'http://localhost:8001/api/health' -UseBasicParsing -TimeoutSec 2 -EA Stop;exit 0}catch{exit 1}" >nul 2>&1
        if !errorlevel!==0 (
            set READY=1
        ) else (
            set /a dots=%%i %% 4
            if !dots!==0 echo    Loading [%%i/40]...
            timeout /t 2 /nobreak >nul
        )
    )
)

echo.
if !READY!==1 (
    color 0B
    echo  ============================================================
    echo.
    echo    APPLICATION IS READY!
    echo.
    echo    Open your browser and go to:
    echo.
    echo         >>> http://localhost:8001 <<<
    echo.
    echo    Login Credentials:
    echo      CHO    =  cho@2024        (City Health Officer)
    echo      DMCHO  =  dmcho@2024      (District MCH Officer)
    echo      HRT1   =  hrt1@2024
    echo      HRT2   =  hrt2@2024  ... HRT8 = hrt8@2024
    echo.
    echo    To STOP: close the minimized "CCMC Server" window in taskbar.
    echo  ============================================================
    echo.
    start http://localhost:8001
) else (
    color 0E
    echo  ============================================================
    echo.
    echo    Server is starting (database still downloading...)
    echo.
    echo    Go to:  http://localhost:8001
    echo    Wait 30 seconds then refresh the page if it is blank.
    echo.
    echo    If it still fails, check the "CCMC Server" window in taskbar.
    echo  ============================================================
    echo.
    start http://localhost:8001
)

echo.
echo  You can close this window. The server keeps running in the background.
echo  Press any key to close...
pause >nul
exit /b 0
