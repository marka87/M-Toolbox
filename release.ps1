$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot

$env:PATH = "$env:LOCALAPPDATA\Programs\NodeJS;$env:ProgramFiles\nodejs;$env:PATH"
$env:CSC_IDENTITY_AUTO_DISCOVERY = 'false'
$env:WIN_CSC_LINK = ''

Write-Host '[1/3] TypeScript-Pruefung...'
npm run typecheck

Write-Host '[2/3] Renderer- und Electron-Build...'
npm run build:renderer

Write-Host '[3/3] Windows-Installer und portable EXE...'
npx electron-builder --win nsis portable

Write-Host ''
Write-Host 'Release-Artefakte liegen in release\'
