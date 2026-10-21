@echo off
REM ============================================================================
REM  run.bat - Dev Seed Users mode (development only)
REM
REM  One-click dev startup for the seeded test-account workflow:
REM
REM    1. Sanity checks (bun in PATH, .env present, port :3000 free)
REM    2. Start the database container        (docker compose up -d db)
REM    3. Wait for PostgreSQL connections     (call bun run db:wait)
REM    4. Apply migrations incl. 0003/0004    (call bun run db:init)
REM    5. Seed the 13 per-role test accounts (call bun run db:seed:dev)
REM       SYSTEM_ADMIN 09991000001 / DevSysAdmin1405!  ... 13 roles in total
REM    6. Dev server on http://localhost:3000 (call bun run dev, foreground;
REM       Ctrl+C stops it). On the login page use the amber "Dev seed users"
REM       panel - it appears only when APP_ENV / VITE_APP_ENV are not
REM       "production". Clicking a role pre-fills the form; the real login
REM       button is still yours to press.
REM
REM  Usage:
REM    run.bat            normal flow
REM    run.bat /noseed    skip step 5 - existing seed users stay as-is
REM    run.bat /nodb      skip steps 2-4 in one go (only start the server)
REM
REM  NOTES FOR MAINTAINERS:
REM    - Every bun invocation is prefixed with `call`: on Windows `bun`
REM      resolves to a batch shim (bun.cmd), and without `call` control
REM      never returns here - the script silently dies after the step.
REM    - No bare parentheses inside cmd if- or for-block echo lines: the
REM      block parser would close the block and report things like
REM      ". was unexpected at this time.".
REM    - Every error path ends with `pause` so a double-clicked window
REM      STAYS OPEN and the failure reason stays readable.
REM    - Only the "db" compose service is started; the "app" service ships
REM      a prebuilt image WITHOUT the dev routes.
REM    - Persian output can look garbled in the console - codepage artifact
REM      only, the data is fine. chcp 65001 reduces the mess.
REM ============================================================================

setlocal EnableExtensions EnableDelayedExpansion
chcp 65001 >nul
cd /d "%~dp0"

echo.
echo === BudgetControl :: Dev Seed Users mode ==============================

REM -- 1. sanity checks ---------------------------------------------------------
where bun >nul 2>nul
if errorlevel 1 (
    echo [run] bun was not found in PATH. Install Bun first: https://bun.sh
    goto :fail
)

if not exist ".env" (
    echo [run] .env was not found in "%CD%".
    echo [run] Copy .env.example to .env first - needs POSTGRES_*, AUTH_*,
    echo [run] APP_ENV=development and VITE_APP_ENV=development.
    goto :fail
)

set SEED=yes
if /i "%~1"=="/noseed" set SEED=no
if /i "%~1"=="/nodb"   set SEED=no

set SKIPDB=no
if /i "%~1"=="/nodb" set SKIPDB=yes

netstat -ano | findstr /c:":3000 " | findstr "LISTENING" >nul 2>nul
if not errorlevel 1 (
    echo [run] Port 3000 is already in use - probably an older dev server.
    choice /c YN /n /m "[run] Kill running bun.exe processes now? [Y/N] "
    if errorlevel 2 goto :fail_busy
    taskkill /f /im bun.exe
    REM taskkill is asynchronous - the socket lingers briefly. Retry ~10 s.
    set PORT_FREED=no
    for /l %%i in (1,1,6) do (
        ping -n 3 127.0.0.1 >nul
        netstat -ano | findstr /c:":3000 " | findstr "LISTENING" >nul 2>nul
        if errorlevel 1 set PORT_FREED=yes
    )
    if "!PORT_FREED!"=="no" (
        echo [run] Port 3000 is still busy after the kill attempt:
        netstat -ano | findstr /c:":3000 " | findstr "LISTENING"
        echo [run] Stop the holder yourself ^(see PID above - taskkill /f /pid NNN^)
        goto :fail
    )
)

REM -- 2. database container ------------------------------------------------------
if "%SKIPDB%"=="yes" goto :server
echo [run] 2/5 ensuring the database container is up ...
docker compose up -d db
if errorlevel 1 (
    echo [run] docker compose failed - is Docker Desktop running?
    goto :fail
)

REM -- 3. wait for PostgreSQL -----------------------------------------------------
echo [run] 3/5 waiting for PostgreSQL ...
call bun run db:wait
if errorlevel 1 (
    echo [run] PostgreSQL did not become ready in time. Inspect the container:
    echo [run]   docker logs csr-budgeting-db-1
    goto :fail
)

REM -- 4. migrations ---------------------------------------------------------------
echo [run] 4/5 applying migrations ...
call bun run db:init
if errorlevel 1 (
    echo [run] migrations failed - see the bun output above.
    goto :fail
)

REM -- 5. seed test users ----------------------------------------------------------
if "%SEED%"=="no" (
    echo [run] 5/5 seeding skipped - flag set, existing test accounts kept.
    goto :server
)
echo [run] 5/5 seeding dev test users ...
call bun run db:seed:dev
if errorlevel 1 (
    echo [run] dev seed failed - see the bun output above.
    goto :fail
)

REM -- 6. dev server ----------------------------------------------------------------
:server
echo.
echo [run] All set - starting dev server on http://localhost:3000
echo [run] Use the amber "Dev seed users" panel on the login page to pre-fill
echo [run] the form, then press the real login button. Ctrl+C stops the server.
echo.
call bun run dev
echo.
echo [run] The dev server stopped. If this was unexpected, scroll up and read
echo [run] the bun error output above.
goto :fail

REM ---------------------------------------------------------------------------
REM  error terminators - pause keeps a double-clicked window open
REM ---------------------------------------------------------------------------
:fail_busy
echo [run] OK - existing server left running. Close this window or press a key.
pause >nul
exit /b 0

:fail
echo.
echo [run] Press any key to close ...
pause >nul
exit /b 1
