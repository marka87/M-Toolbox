@echo off
setlocal
cd /d "%~dp0"

echo ========================================================
echo   M-Toolbox - Setup & Portable EXE Builder
echo ========================================================
echo.

set "PATH=%LOCALAPPDATA%\Programs\NodeJS;%ProgramFiles%\nodejs;%PATH%"
set "CSC_IDENTITY_AUTO_DISCOVERY=false"
set "WIN_CSC_LINK="

echo [1/3] TypeScript Pruefung...
call npm run typecheck
if %ERRORLEVEL% NEQ 0 (
    echo [FEHLER] TypeScript-Fehler gefunden! Abbruch.
    pause
    exit /b 1
)

echo.
echo [2/3] Kompiliere Frontend und Main-Process (Vite)...
call npx vite build
if %ERRORLEVEL% NEQ 0 (
    echo [FEHLER] Vite Build fehlgeschlagen! Abbruch.
    pause
    exit /b 1
)

echo.
echo [3/3] Erzeuge Setup-EXE und Portable-EXE (electron-builder)...
call npx electron-builder --win nsis portable
if %ERRORLEVEL% NEQ 0 (
    echo [FEHLER] Erstellung fehlgeschlagen! Abbruch.
    pause
    exit /b 1
)

echo.
echo ========================================================
echo [ERFOLG] Beide Versionen erfolgreich erstellt:
echo   1. Setup-Installer : %~dp0release\M-Toolbox-Setup-1.9.1.exe
echo   2. Portable EXE    : %~dp0release\M-Toolbox-1.9.1-portable.exe
echo ========================================================
echo.

if exist "release\" (
    explorer.exe "%~dp0release"
)

pause

