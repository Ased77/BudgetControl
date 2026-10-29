@echo off
REM Docker-backed development launcher. Bun and dependencies stay inside Docker.
REM Usage: run.bat            start DB, migrate, seed dev users, launch Vite
REM        run.bat /noseed    skip the disposable dev-user seed step
REM        run.bat /nodb      do not start/check the DB (it must already be running)
setlocal EnableExtensions
cd /d "%~dp0"
chcp 65001 >nul

echo.
echo === BudgetControl :: Docker development ===============================

where docker >nul 2>nul
if errorlevel 1 (
    echo [run] Docker CLI was not found. Install and start Docker Desktop.
    goto :fail
)

docker info >nul 2>nul
if errorlevel 1 (
    echo [run] Docker is not running. Start Docker Desktop and try again.
    goto :fail
)

if not exist ".env" (
    echo [run] .env was not found in "%CD%".
    echo [run] Copy .env.example to .env and set the required values first.
    goto :fail
)

docker compose config --quiet
if errorlevel 1 (
    echo [run] Docker Compose configuration is invalid. Check .env values.
    goto :fail
)

echo [run] Building the development image. Bun and packages are stored by Docker.
docker compose --profile dev build dev
if errorlevel 1 goto :docker_fail

echo [run] Installing/synchronizing packages inside Docker ...
docker compose --profile dev run --rm dev bun install --frozen-lockfile
if errorlevel 1 goto :docker_fail

set SEED=yes
set SKIPDB=no
if /i "%~1"=="/noseed" set SEED=no
if /i "%~1"=="/nodb" (
    set SEED=no
    set SKIPDB=yes
)

if "%SKIPDB%"=="yes" goto :server

echo [run] Starting PostgreSQL ...
docker compose up -d db
if errorlevel 1 goto :docker_fail

echo [run] Waiting for PostgreSQL ...
docker compose --profile dev run --rm dev bun run db:wait
if errorlevel 1 goto :docker_fail

echo [run] Applying migrations ...
docker compose --profile dev run --rm dev bun run db:init
if errorlevel 1 goto :docker_fail

if "%SEED%"=="no" goto :server
echo [run] Seeding disposable development users ...
docker compose --profile dev run --rm dev bun run db:seed:dev
if errorlevel 1 goto :docker_fail

:server
echo.
echo [run] Starting the Docker development server at http://localhost:3000
echo [run] Source edits are mounted into the container; Ctrl+C stops the service.
echo.
if "%SKIPDB%"=="yes" (
    docker compose --profile dev up --no-deps dev
) else (
    docker compose --profile dev up dev
)
if errorlevel 1 goto :docker_fail
exit /b 0

:docker_fail
echo.
echo [run] Docker command failed. Check the output above and run:
echo [run]   docker compose --profile dev logs db

goto :fail

:fail
echo.
echo [run] Press any key to close ...
pause >nul
exit /b 1
