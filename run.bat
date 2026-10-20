@echo off
chcp 65001 >nul
REM ===========================================================================
REM  CSR Budgeting (سامانه بودجه‌ریزی مسئولیت اجتماعی) - Windows launcher
REM
REM  Double-click this file to run the app on Docker (docker-compose.yml):
REM      run.bat            -> build & start the whole stack, then open the app
REM      run.bat status     -> container health + DB/app reachability, one shot
REM      run.bat stop       -> stop the stack
REM      run.bat logs       -> follow app container logs
REM      run.bat migrate    -> one-time SQLite -> PostgreSQL import (profile tools)
REM  Native (non-Docker) modes are still available:
REM      run.bat dev        -> Bun dev server (requires Bun on PATH)
REM      run.bat prod       -> Bun production build + start
REM
REM  Override the host port by setting PORT first, e.g.:  set PORT=4000 && run.bat
REM ===========================================================================
setlocal
cd /d "%~dp0"

REM Some shells export PORT=0; treat that the same as unset so the URLs below
REM always match the port the app actually listens on.
if "%PORT%"=="" set "PORT=3000"
if "%PORT%"=="0" set "PORT=3000"

set "MODE=%~1"
if /i "%MODE%"=="" goto :docker
if /i "%MODE%"=="docker" goto :docker
if /i "%MODE%"=="stop" goto :stop
if /i "%MODE%"=="down" goto :stop
if /i "%MODE%"=="logs" goto :logs
if /i "%MODE%"=="status" goto :status
if /i "%MODE%"=="migrate" goto :migrate
if /i "%MODE%"=="dev" goto :dev
if /i "%MODE%"=="development" goto :dev
if /i "%MODE%"=="prod" goto :prod
if /i "%MODE%"=="production" goto :prod

echo [ERROR] Unknown mode: %MODE%
echo         Valid modes: (none)=docker, status, stop, logs, migrate, dev, prod
pause
exit /b 1

REM ----------------------------- Docker mode --------------------------------
:docker
where docker >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Docker was not found on PATH.
  echo         Install Docker Desktop:  https://docs.docker.com/desktop/setup/install/windows-install/
  echo         Then reopen this window and run run.bat again.
  pause
  exit /b 1
)

REM Compose refuses to start without .env values (POSTGRES_*, AUTH_JWT_SECRET).
if not exist ".env" (
  if exist ".env.example" (
    echo .env is missing - copying .env.example to .env...
    copy /y ".env.example" ".env" >nul
    echo.
    echo   [ATTENTION] Edit .env now and set POSTGRES_PASSWORD ^(and optionally
    echo   AUTH_JWT_SECRET - generate one with:  openssl rand -hex 32^).
    echo   Re-run run.bat afterwards.
    echo.
  ) else (
    echo [ERROR] Neither .env nor .env.example exists - cannot configure the stack.
    pause
    exit /b 1
  )
)

echo Building and starting the Docker stack...
call docker compose up -d --build
if errorlevel 1 (
  echo [ERROR] "docker compose up" failed.
  pause
  exit /b 1
)
echo.
echo   CSR Budgeting - running on Docker
echo   Waiting for the app to become healthy^(the first boot seeds the DB^)...
call docker compose up -d --wait --wait-timeout 180
if errorlevel 1 (
  echo [WARN ] App is not healthy yet - check logs with:  run.bat logs
)

REM Open the app at the compose-reported host port, not a hardcoded one.
set "APPURL=http://localhost:%PORT%"
set "APPADDR="
for /f "tokens=*" %%p in ('docker compose port app 3000') do set "APPADDR=%%p"
set "APPPORT="
if defined APPADDR for /f "tokens=2 delims=:" %%q in ("%APPADDR%") do set "APPPORT=%%q"
if defined APPPORT set "APPURL=http://localhost:%APPPORT%"

start "" /min powershell -NoProfile -Command "Start-Sleep -Seconds 3; Start-Process '%APPURL%'"
echo   URL: %APPURL%   (stop with:  run.bat stop)
echo   Logs: run.bat logs
goto :done

REM ------------------------------- stop -------------------------------------
:stop
where docker >nul 2>nul || (
  echo [ERROR] Docker was not found on PATH.
  pause
  exit /b 1
)
call docker compose down
goto :done

REM ------------------------------- logs -------------------------------------
:logs
where docker >nul 2>nul || (
  echo [ERROR] Docker was not found on PATH.
  pause
  exit /b 1
)
call docker compose logs -f app
set "EXITCODE=%ERRORLEVEL%"
goto :done

REM ------------------------------ status -----------------------------------
REM One shot: container state, database reachability (pg_isready inside the
REM db container) and app health (host curl against /api/health on the real
REM published host port, which may differ from the default 3000).
:status
where docker >nul 2>nul || (
  echo [ERROR] Docker was not found on PATH.
  pause
  exit /b 1
)

echo.
echo   === Containers ===
call docker compose ps --format "table {{.Name}}\t{{.Status}}"

echo.
echo   === Database ===
docker compose exec -T db sh -c "pg_isready -U \"$$POSTGRES_USER\" -d \"$$POSTGRES_DB\" -h 127.0.0.1"
if errorlevel 1 (
  echo   [WARN ] PostgreSQL is not accepting connections yet.
) else (
  echo   [ OK  ] PostgreSQL reached through the internal network.
)

echo.
echo   === App ===
REM Ask compose for the actual host port bound to the container's 3000
REM (e.g. 127.0.0.1:3210) instead of assuming the default.
set "APPADDR="
for /f "tokens=*" %%p in ('docker compose port app 3000') do set "APPADDR=%%p"
set "APPPORT="
if defined APPADDR for /f "tokens=2 delims=:" %%q in ("%APPADDR%") do set "APPPORT=%%q"
if not defined APPPORT (
  echo   [WARN ] App container has no published port - is it running?
  set "EXITCODE=1"
  goto :done
)
set "HEALTHCODE="
for /f "tokens=*" %%i in ('curl -s -o NUL -m 5 -w "%%{http_code}" "http://localhost:%APPPORT%/api/health"') do set "HEALTHCODE=%%i"
if "%HEALTHCODE%"=="200" (
  echo   [ OK  ] /api/health answered HTTP 200 on http://localhost:%APPPORT%
) else if "%HEALTHCODE%"=="" (
  echo   [WARN ] No answer from http://localhost:%APPPORT%/api/health - is the app running? ^(curl missing/timeout counts as this too^)
) else (
  echo   [WARN ] /api/health answered HTTP %HEALTHCODE% on http://localhost:%APPPORT%
)

set "EXITCODE=0"
if not "%HEALTHCODE%"=="200" set "EXITCODE=1"
goto :done

REM ----------------------------- migrate ------------------------------------
:migrate
where docker >nul 2>nul || (
  echo [ERROR] Docker was not found on PATH.
  pause
  exit /b 1
)
call docker compose --profile tools run --rm migrate
set "EXITCODE=%ERRORLEVEL%"
goto :done

REM ------------------------------ dev ---------------------------------------
:dev
where bun >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Bun was not found on PATH.
  echo         Install it with:  powershell -c "irm bun.sh/install.ps1 ^| iex"
  echo         Or use Docker instead: run this file without arguments.
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

echo.
echo   CSR Budgeting - development server
echo   URL: http://localhost:%PORT%   (Ctrl+C to stop)
echo.

REM Open the app once the dev server has had a few seconds to boot.
start "" /min powershell -NoProfile -Command "Start-Sleep -Seconds 6; Start-Process 'http://localhost:%PORT%'"

call bun run dev
set "EXITCODE=%ERRORLEVEL%"
goto :done

REM ------------------------------ prod --------------------------------------
:prod
where bun >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Bun was not found on PATH.
  echo         Install it with:  powershell -c "irm bun.sh/install.ps1 ^| iex"
  echo         Or use Docker instead: run this file without arguments.
  pause
  exit /b 1
)
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
endlocal & exit /b %EXITCODE%
