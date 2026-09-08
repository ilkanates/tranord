@echo off
chcp 65001 >nul
title Tranord Kontrol
echo.
echo   === TRANORD KONTROL ===
echo.
where node >nul 2>&1 && (for /f "delims=" %%v in ('node -v') do echo   node    : %%v) || echo   node    : YOK
where npm  >nul 2>&1 && (for /f "delims=" %%v in ('npm -v')  do echo   npm     : %%v) || echo   npm     : YOK
echo.
if exist "%~dp0server\node_modules" (echo   server\node_modules : VAR) else (echo   server\node_modules : YOK - npm install gerek)
if exist "%~dp0client\node_modules" (echo   client\node_modules : VAR) else (echo   client\node_modules : YOK - npm install gerek)
if exist "%~dp0client\.env.local"   (echo   client\.env.local   : VAR) else (echo   client\.env.local   : YOK)
echo.
echo   --- Dolu portlar ---
for %%p in (3001 3311 5173 5180) do (
  netstat -ano | findstr :%%p | findstr LISTENING >nul 2>&1 && echo   %%p : DOLU || echo   %%p : bos
)
echo.
pause
