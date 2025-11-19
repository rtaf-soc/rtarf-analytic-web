@echo off
title Defensive Operator - Service Launcher

echo ================================================
echo   Defensive Operator - Starting Services
echo ================================================
echo.

set "BACKEND_PATH=%~dp0backend"
set "BACKEND_APP_PATH=%~dp0backend\app"
set "FRONTEND_PATH=%~dp0frontend"

echo [1/2] Starting Backend (Main Service)...
start "Backend Service" cmd /k "cd /d "%BACKEND_PATH%" && venv\Scripts\activate && uvicorn app.main:app --reload"

timeout /t 2 /nobreak >nul

echo [2/2] Starting Frontend (React + Vite)...
start "Frontend Service" cmd /k "cd /d "%FRONTEND_PATH%" && npm run dev"

echo.
echo ================================================
echo   All services started successfully!
echo   Check the new terminal windows.
echo ================================================
pause
