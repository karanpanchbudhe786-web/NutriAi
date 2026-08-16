@echo off
title NutriAI Full-Stack Launcher
echo ===================================================
echo           STARTING NUTRIAI FULL-STACK APP
echo ===================================================
echo.

echo 1. Starting NutriAI Backend API (Port 5000)...
start /b python backend/run.py

echo 2. Starting Frontend Web Server (Port 8080)...
start /b python -m http.server 8080

timeout /t 2 /nobreak >nul

echo.
echo ===================================================
echo NutriAI is running!
echo Frontend: http://localhost:8080/frontend/
echo Backend:  http://localhost:5000/api
echo ===================================================
echo.
echo Opening NutriAI in your default browser...
start http://localhost:8080/frontend/
echo Press any key to exit this launcher window...
pause >nul
