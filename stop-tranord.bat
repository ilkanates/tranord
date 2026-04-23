@echo off
chcp 65001 >nul
title Tranord Stop

echo.
echo   Tranord pencereleri kapatiliyor...
echo.

REM Baslik'a gore pencereleri kapat (start-tranord.bat ile uyumlu)
taskkill /FI "WINDOWTITLE eq Tranord SERVER*" /T /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq Tranord CLIENT*" /T /F >nul 2>&1

REM Port tabanli yedek temizlik (3001 = server, 5173 = client)
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3001 ^| findstr LISTENING') do taskkill /F /PID %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5173 ^| findstr LISTENING') do taskkill /F /PID %%a >nul 2>&1

echo   Tamam.
timeout /t 2 /nobreak >nul
exit
