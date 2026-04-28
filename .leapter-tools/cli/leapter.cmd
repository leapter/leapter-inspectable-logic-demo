@echo off
rem Prefer the bundled CLI in this repo, fall back to global install
set "SCRIPT_DIR=%~dp0"
set "LOCAL_CLI=%SCRIPT_DIR%leapter-cli.cjs"
set "GLOBAL_CLI=%USERPROFILE%\.leapter\bin\leapter-cli.cjs"

if exist "%LOCAL_CLI%" goto :run_local
if exist "%GLOBAL_CLI%" goto :run_global

echo Error: leapter CLI not found. Expected at: >&2
echo   %LOCAL_CLI% (local) >&2
echo   %GLOBAL_CLI% (global) >&2
exit /b 1

:run_local
node "%LOCAL_CLI%" %*
exit /b %ERRORLEVEL%

:run_global
node "%GLOBAL_CLI%" %*
exit /b %ERRORLEVEL%