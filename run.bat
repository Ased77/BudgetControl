@echo off
chcp 65001 >nul
REM ===========================================================================
REM  CSR Budgeting (سامانه بودجه‌ریزی مسئولیت اجتماعی) - Windows launcher
REM
REM  Double-click this file to start the app in development mode.
REM  Override the port by setting PORT first, e.g.:  set PORT=4000 && run.bat
REM  Production build instead of dev server:  run.bat prod
REM ===========================================================================
setlocal
cd /d "%~dp0"

REM Some shells export PORT=0; treat that the same as unset so the URLs below
REM always match the port the server actually listens on.
if "%PORT%"=="" set "PORT=3000"
if "%PORT%"=="0" set "PORT=3000"

where bun >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Bun was not found on PATH.
  echo         Install it with:  powershell -c "irm bun.sh/install.ps1 ^| iex"
  echo         Then reopen this window and run run.bat again.
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo Dependencies are missing - running "bun install"...
  call bun install
  if errorlevel 1 (
    echo [ERROR] "bun install" failed.
    pause
    exit /b 1
  )
)

set "MODE=%~1"
if /i "%MODE%"=="prod" goto :prod
if /i "%MODE%"=="production" goto :prod

echo.
echo   CSR Budgeting - development server
echo   URL: http://localhost:%PORT%   (Ctrl+C to stop)
echo.

REM Open the app once the dev server has had a few seconds to boot.
start "" /min powershell -NoProfile -Command "Start-Sleep -Seconds 6; Start-Process 'http://localhost:%PORT%'"

call bun run dev
set "EXITCODE=%ERRORLEVEL%"
goto :done

:prod
echo.
echo   CSR Budgeting - production build
echo   URL: http://localhost:%PORT%   (Ctrl+C to stop)
echo.
call bun run build
if errorlevel 1 (
  echo [ERROR] Build failed.
  pause
  exit /b 1
)
set "NODE_ENV=production"
call bun run start
set "EXITCODE=%ERRORLEVEL%"

:done
echo.
echo Server stopped (exit code %EXITCODE%).
pause
endlocal & exit /b %EXITCODE%
