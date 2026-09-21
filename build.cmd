@echo off
setlocal
cd /d "%~dp0"

echo ===================================================
echo   M-Toolbox - Lokaler EXE Builder
echo ===================================================

set "PATH=%LOCALAPPDATA%\Programs\NodeJS;%ProgramFiles%\nodejs;%PATH%"
set "CSC_IDENTITY_AUTO_DISCOVERY=false"
set "WIN_CSC_LINK="

echo.
echo [1/3] TypeScript Pruefung...
call npm run typecheck
if %ERRORLEVEL% NEQ 0 (
    echo [FEHLER] TypeScript-Fehler gefunden! Abbruch.
    pause
    exit /b 1
)

echo.
echo [2/3] Kompiliere Vite & Electron Bundle...
call npx vite build
if %ERRORLEVEL% NEQ 0 (
    echo [FEHLER] Vite Build fehlgeschlagen! Abbruch.
    pause
    exit /b 1
)

echo.
echo [3/3] Erzeuge Windows EXE Paket (release\win-unpacked)...
call npx electron-builder --win dir
if %ERRORLEVEL% NEQ 0 (
    echo [FEHLER] Paketierung fehlgeschlagen! Abbruch.
    pause
    exit /b 1
)

echo.
echo ===================================================
echo [ERFOLG] EXE erfolgreich erstellt:
echo   Pfad: %~dp0release\win-unpacked\M-Toolbox.exe
echo ===================================================
echo.

if exist "release\win-unpacked\M-Toolbox.exe" (
    explorer.exe /select,"%~dp0release\win-unpacked\M-Toolbox.exe"
)

pause

