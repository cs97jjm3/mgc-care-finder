@echo off
title MGC Care Finder + ngrok
color 0A

echo ========================================
echo MGC Care Finder - Auto Startup
echo ========================================
echo.

REM Start the API server in a new window
echo [1/2] Starting MGC Care Finder API...
start "MGC Care Finder API" cmd /k "cd /d C:\Users\murre\Documents\GitHub\mgc-care-finder && npm start"

REM Wait 10 seconds for server to start
echo [2/2] Waiting 5 seconds for server to initialize...
timeout /t 5 /nobreak >nul

REM Start ngrok in a new window
echo [2/2] Starting ngrok tunnel...
start "ngrok Tunnel" cmd /k "ngrok http 3000"

REM Start ed's car checker in a new window
echo [2/2] Starting ngrok tunnel...
start "ed's car checke" cmd /k "cd /d C:\Users\murre\Documents\GitHub\MGC Car Tracker && npm start"

echo.
echo ========================================
echo 3 services started!
echo ========================================
echo.
echo API Server: http://localhost:3000
echo ngrok will show public URL in its window
echo.
echo Press any key to exit this window...
pause >nul
