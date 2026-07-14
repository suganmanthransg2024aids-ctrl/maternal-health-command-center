@echo off
title CCMC - Stopping Server
color 0C

echo.
echo  Stopping CCMC Maternal Health Tracker...
echo.

for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr ":8001 " ^| findstr "LISTENING"') do (
    echo  Stopping process PID %%a on port 8001...
    taskkill /F /PID %%a >nul 2>&1
    echo  Stopped.
)

REM Check if anything was running
netstat -aon 2>nul | findstr ":8001 " | findstr "LISTENING" >nul 2>&1
if errorlevel 1 (
    echo  CCMC server is no longer running.
) else (
    echo  Warning: Port 8001 may still be in use by another process.
)

echo.
timeout /t 2 /nobreak >nul
exit /b 0
