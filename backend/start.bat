@echo off
echo ============================================================
echo   HIGH RISK MOTHER TRACKER - CCMC
echo   Maternal Health Monitoring and Decision Support Platform
echo ============================================================
echo.
echo [1/1] Starting server (Node.js + React)...
echo       Loading 34 PHC sheets -- please wait ~10 seconds...
echo.

start "CCMC Server" cmd /k "cd /d "%~dp0" && npm install --no-fund --no-audit && node server.js"

echo Waiting for Excel to load...
timeout /t 12 /nobreak >nul

start "" "http://localhost:8001"

echo.
echo ============================================================
echo   App is now open in your browser.
echo.
echo   LOCAL  : http://localhost:8001
echo   LAN    : http://192.168.0.113:8001
echo.
echo   Login Credentials:
echo   DMCHO  / dmcho@2026   (Full Access - All PHCs)
echo   CHO    / cho@2026     (Full Access - All PHCs)
echo   HRT1   / hrt1@2026    (Restricted to assigned PHCs)
echo   HRT2   / hrt2@2026
echo   HRT3   / hrt3@2026
echo   HRT4   / hrt4@2026
echo   HRT5   / hrt5@2026
echo   HRT6   / hrt6@2026
echo   HRT7   / hrt7@2026
echo   HRT8   / hrt8@2026
echo ============================================================
pause
