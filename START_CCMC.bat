@echo off
setlocal
title CCMC Maternal Health Tracker
color 0A

echo.
echo  ==========================================================
echo    CCMC MATERNAL HEALTH TRACKER
echo    Coimbatore City Municipal Corporation
echo    Government of Tamil Nadu
echo  ==========================================================
echo.

cd /d "%~dp0"

REM ── Kill existing instances on port 8001 ──────────────────────────────────
echo  [1/4] Checking for existing instances on port 8001...
for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr ":8001 " ^| findstr "LISTENING"') do (
    echo    Stopping previous instance (PID %%a)...
    taskkill /F /PID %%a >nul 2>&1
)
timeout /t 1 /nobreak >nul
echo.

REM ── Activate venv if available ────────────────────────────────────────────
echo  [2/4] Checking Python environment...
if exist "venv\Scripts\activate.bat" (
    call venv\Scripts\activate.bat
    echo    Using virtual environment (venv).
) else (
    where python >nul 2>&1
    if errorlevel 1 (
        echo.
        echo   ERROR: Python not found.
        echo   Please run SETUP_CCMC.bat first.
        echo.
        pause
        exit /b 1
    )
    echo    Using system Python.
)
echo.

REM ── Start Flask server ────────────────────────────────────────────────────
echo  [3/4] Starting CCMC server...
if exist "backend_maternal\server.log" del /f /q "backend_maternal\server.log"
start /B "" python "backend_maternal\app.py" > "backend_maternal\server.log" 2>&1
echo    Server process started. Loading Excel database...
echo.

REM ── Poll until server is ready ────────────────────────────────────────────
echo  [4/4] Waiting for database to load (may take up to 60 seconds)...
echo.
set attempts=0

:WAIT_LOOP
set /a attempts+=1

REM Wait 3 seconds between checks
ping -n 4 127.0.0.1 >nul 2>&1

REM Try health endpoint
curl -s --max-time 2 http://localhost:8001/api/health >nul 2>&1
if not errorlevel 1 goto READY

if %attempts% GEQ 25 goto TIMEOUT

set /a pct=%attempts%*4
echo    Loading database... [%pct%%%]  (attempt %attempts%/25)
goto WAIT_LOOP

:READY
echo.
echo  ==========================================================
echo    DATABASE LOADED  ^|  SERVER READY
echo.
echo    URL  :  http://localhost:8001
echo    Log  :  backend_maternal\server.log
echo.
echo    Login Credentials:
echo      DMCHO  ^|  dmcho@2024       (Full access)
echo      CHO    ^|  cho@2024         (Full access)
echo      HRT1   ^|  hrt1@2024        (Assigned PHCs only)
echo      HRT2-8 ^|  hrt2@2024 ...
echo.
echo    Press any key to STOP the server and exit.
echo  ==========================================================
echo.
start http://localhost:8001
pause >nul
goto SHUTDOWN

:TIMEOUT
echo.
echo  ==========================================================
echo    NOTE: Server is taking longer than expected.
echo    The Excel file has 4,900+ records — first load is slow.
echo    Check backend_maternal\server.log if something went wrong.
echo.
echo    Attempting to open http://localhost:8001 anyway...
echo    The page will load once the database finishes.
echo.
echo    Press any key to STOP the server and exit.
echo  ==========================================================
echo.
start http://localhost:8001
pause >nul

:SHUTDOWN
echo.
echo  Stopping CCMC server...
for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr ":8001 " ^| findstr "LISTENING"') do (
    taskkill /F /PID %%a >nul 2>&1
)
echo  Server stopped. Goodbye.
timeout /t 2 /nobreak >nul
exit /b 0
