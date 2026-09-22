@echo off
setlocal
cd /d "%~dp0"

set "PATH=%LOCALAPPDATA%\Programs\NodeJS;%ProgramFiles%\nodejs;%PATH%"
set "CSC_IDENTITY_AUTO_DISCOVERY=false"
set "WIN_CSC_LINK="

echo [1/3] TypeScript-Pruefung...
call npm run typecheck
if errorlevel 1 exit /b 1

echo [2/3] Renderer- und Electron-Build...
call npm run build:renderer
if errorlevel 1 exit /b 1

echo [3/3] Windows-Installer und portable EXE...
call npx electron-builder --win nsis portable
if errorlevel 1 exit /b 1

echo.
echo Release-Artefakte liegen in release\
endlocal
