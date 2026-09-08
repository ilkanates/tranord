@echo off
chcp 65001 >nul
title Tranord DEV Launcher

set SERVER_PORT=3311
set CLIENT_PORT=5180

echo.
echo   ========================================
echo     TRANORD - DEV MODU
echo   ========================================
echo   PostgreSQL gerekmez. Veri: server\.dev-data.json
echo.

where node >nul 2>&1
if errorlevel 1 (
  echo   HATA: node bulunamadi. Node.js kurulu mu?
  pause
  exit /b 1
)
for /f "delims=" %%v in ('node -v') do echo   node %%v

if not exist "%~dp0server\node_modules" (
  echo.
  echo   [1/2] server bagimliliklari kuruluyor... ilk seferde birkac dakika surer
  pushd "%~dp0server"
  call npm install --no-audit --no-fund
  if errorlevel 1 ( echo   HATA: server npm install basarisiz. & popd & pause & exit /b 1 )
  popd
)
if not exist "%~dp0client\node_modules" (
  echo.
  echo   [2/2] client bagimliliklari kuruluyor...
  pushd "%~dp0client"
  call npm install --no-audit --no-fund
  if errorlevel 1 ( echo   HATA: client npm install basarisiz. & popd & pause & exit /b 1 )
  popd
)

echo.
echo   Server : http://localhost:%SERVER_PORT%
echo   Client : http://localhost:%CLIENT_PORT%
echo   Giris  : http://localhost:%CLIENT_PORT%/dev-login.html
echo.
echo   Iki pencere acilacak. Hata olursa o pencerelerdeki yaziyi oku.
echo.

start "Tranord SERVER" cmd /k "cd /d %~dp0server && set PORT=%SERVER_PORT% && node index.dev.js"
start "Tranord CLIENT" cmd /k "cd /d %~dp0client && npm run dev -- --port %CLIENT_PORT% --strictPort"

timeout /t 8 /nobreak >nul
start http://localhost:%CLIENT_PORT%/dev-login.html

exit
