@echo off
rem Initialize the web app for local development.
rem Copies .env.example to .env.local. Local dev runs blueprints in-browser
rem via @leapter/runtime-browser -- no runtime URL or API key required.

set "SCRIPT_DIR=%~dp0"
set "ENV_EXAMPLE=%SCRIPT_DIR%web\.env.example"
set "ENV_LOCAL=%SCRIPT_DIR%web\.env.local"

if exist "%ENV_LOCAL%" (
    echo web\.env.local already exists -- skipping (delete it first to re-init)
    exit /b 0
)

if not exist "%ENV_EXAMPLE%" (
    echo Error: web\.env.example not found >&2
    exit /b 1
)

copy /Y "%ENV_EXAMPLE%" "%ENV_LOCAL%" >nul

echo Created web\.env.local
