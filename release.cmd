@echo off
setlocal
cd /d "%~dp0"
title M-Toolbox Release & Version Automation

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0release.ps1" %*
set "EXIT_CODE=%ERRORLEVEL%"

if %EXIT_CODE% NEQ 0 (
    echo.
    echo [FEHLER] Release-Vorgang mit Exit-Code %EXIT_CODE% abgebrochen.
    pause
    exit /b %EXIT_CODE%
)

echo.
pause
endlocal
