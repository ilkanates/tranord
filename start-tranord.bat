@echo off
chcp 65001 >nul
title Tranord Launcher

echo.
echo   ========================================
echo     TRANORD - Baslatiliyor
echo   ========================================
echo.
echo   Server : http://localhost:3001
echo   Client : http://localhost:5173
echo.
echo   Iki ayri pencere acilacak (SERVER + CLIENT).
echo   Durdurmak icin o pencereleri kapat.
echo.

REM --- SERVER penceresi ---
start "Tranord SERVER" cmd /k "cd /d %~dp0server && echo [SERVER] baslatiliyor... && npm start"

REM --- CLIENT penceresi ---
start "Tranord CLIENT" cmd /k "cd /d %~dp0client && echo [CLIENT] baslatiliyor... && npm run dev"

REM --- Tarayici otomatik acilsin (vite hazir olana kadar biraz bekle) ---
timeout /t 5 /nobreak >nul
start http://localhost:5173

exit
