@echo off
rem Initialize the web app for local development.
rem Copies .env.example → .env.local with the local runtime URL enabled.

set "SCRIPT_DIR=%~dp0"
set "ENV_EXAMPLE=%SCRIPT_DIR%web\.env.example"
set "ENV_LOCAL=%SCRIPT_DIR%web\.env.local"

if exist "%ENV_LOCAL%" (
    echo web\.env.local already exists — skipping (delete it first to re-init)
    exit /b 0
)

if not exist "%ENV_EXAMPLE%" (
    echo Error: web\.env.example not found >&2
    exit /b 1
)

rem Copy example and replace the commented runtime URL with the local dev one
(
    for /f "usebackq delims=" %%L in ("%ENV_EXAMPLE%") do (
        set "LINE=%%L"
        setlocal EnableDelayedExpansion
        if "!LINE!"=="# LEAPTER_RUNTIME_URL=https://runtime.example.com/api/v1/{appspace}/{project}" (
            echo LEAPTER_RUNTIME_URL=http://localhost:4004/api/v1/_/_
        ) else (
            echo(!LINE!
        )
        endlocal
    )
) > "%ENV_LOCAL%"

echo Created web\.env.local (local runtime at :4004)
