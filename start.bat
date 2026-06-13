@echo off
echo ============================================================
echo   HIGH RISK MOTHER TRACKER - CCMC
echo   Maternal Health Monitoring and Decision Support Platform
echo ============================================================
echo.
echo [1/1] Starting server (Flask + React)...
echo       Loading 34 PHC sheets -- please wait ~45 seconds...
echo.

start "CCMC Server" cmd /k "cd /d "%~dp0backend_maternal" && pip install -r requirements.txt -q && python -u app.py"

echo Waiting for Excel to load...
timeout /t 50 /nobreak >nul

start "" "http://localhost:8001"

echo.
echo ============================================================
echo   App is now open in your browser.
echo.
echo   LOCAL  : http://localhost:8001
echo   LAN    : http://192.168.0.113:8001
echo.
echo   Login Credentials:
echo   DMCHO  / dmcho@2024   (Full Access - All PHCs)
echo   CHO    / cho@2024     (Full Access - All PHCs)
echo   HRT1   / hrt1@2024    (Restricted to assigned PHCs)
echo   HRT2   / hrt2@2024
echo   HRT3   / hrt3@2024
echo   HRT4   / hrt4@2024
echo   HRT5   / hrt5@2024
echo   HRT6   / hrt6@2024
echo   HRT7   / hrt7@2024
echo   HRT8   / hrt8@2024
echo ============================================================
pause
