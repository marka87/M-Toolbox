@echo off
setlocal
cd /d "%~dp0"

echo ========================================================
echo   M-Toolbox - Setup und Portable EXE Builder
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
echo [ERFOLG] Beide Versionen erfolgreich im Ordner "release\" erstellt:
echo   - Setup-Installer (NSIS)
echo   - Portable EXE
echo ========================================================
echo.

if exist "release\" (
    explorer.exe "%~dp0release"
)

pause
