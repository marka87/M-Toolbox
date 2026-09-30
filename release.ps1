<#
.SYNOPSIS
    M-Toolbox Release & Version Automation Script
.DESCRIPTION
    Interaktives oder automatisiertes Script fuer Versions-Updates, Git-Commit, Tagging,
    GitHub-Push und das Erstellen von Windows Offline-EXE Builds (Portable & Setup).
#>

param(
    [string]$TargetVersion = '',
    [ValidateSet('portable', 'setup', 'both', 'none', '')]
    [string]$BuildType = '',
    [switch]$Push = $false,
    [switch]$NoPrompt = $false
)

$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot

# Encoding & Console Setup
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$env:PATH = "$env:LOCALAPPDATA\Programs\NodeJS;$env:ProgramFiles\nodejs;$env:PATH"
$env:CSC_IDENTITY_AUTO_DISCOVERY = 'false'
$env:WIN_CSC_LINK = ''

function Write-Step {
    param([string]$Num, [string]$Title)
    Write-Host ""
    Write-Host "[$Num] $Title" -ForegroundColor Cyan
}

function Write-Success {
    param([string]$Text)
    Write-Host "  [OK] $Text" -ForegroundColor Green
}

function Write-Info {
    param([string]$Text)
    Write-Host "  [INFO] $Text" -ForegroundColor Yellow
}

function Write-Err {
    param([string]$Text)
    Write-Host "  [ERROR] $Text" -ForegroundColor Red
}

Write-Host "==============================================================" -ForegroundColor DarkCyan
Write-Host "           M-Toolbox Release & Version Automation             " -ForegroundColor Cyan
Write-Host "==============================================================" -ForegroundColor DarkCyan

# ------------------------------------------------------------------------------
# 1. Aktuelle Version aus package.json ermitteln
# ------------------------------------------------------------------------------
$pkgPath = Join-Path $PSScriptRoot 'package.json'
if (-not (Test-Path $pkgPath)) {
    Write-Err "package.json wurde in $PSScriptRoot nicht gefunden!"
    exit 1
}

$rawJson = [System.IO.File]::ReadAllText($pkgPath, [System.Text.Encoding]::UTF8)
$pkg = $rawJson | ConvertFrom-Json
$currentVer = $pkg.version

if (-not $currentVer) {
    Write-Err "Keine 'version' in package.json gefunden!"
    exit 1
}

Write-Host "Aktuelle Version: " -NoNewline
Write-Host "v$currentVer" -ForegroundColor Green

# Semver Vorschlaege berechnen
if ($currentVer -match '^(\d+)\.(\d+)\.(\d+)') {
    $maj = [int]$matches[1]
    $min = [int]$matches[2]
    $pat = [int]$matches[3]

    $optPatch = "$maj.$min.$($pat + 1)"
    $optMinor = "$maj.$($min + 1).0"
    $optMajor = "$($maj + 1).0.0"
} else {
    $optPatch = "2.7.1"
    $optMinor = "2.8.0"
    $optMajor = "3.0.0"
}

# ------------------------------------------------------------------------------
# 2. Ziel-Version bestimmen
# ------------------------------------------------------------------------------
$finalVersion = $TargetVersion

if (-not $finalVersion) {
    Write-Host ""
    Write-Host "Ziel-Version waehlen:" -ForegroundColor Yellow
    Write-Host "  [1] Patch: v$optPatch (Bugfixes, kleine Verbesserungen) [Standard]"
    Write-Host "  [2] Minor: v$optMinor (Neue Features, Modul-Erweiterungen)"
    Write-Host "  [3] Major: v$optMajor (Großer Versionssprung)"
    Write-Host "  [4] Manuelle Eingabe"
    Write-Host "  [0] Abbrechen"

    $choice = Read-Host "`nAuswahl [1/2/3/4/0, Enter=1]"
    if (-not $choice) { $choice = "1" }

    switch ($choice.Trim()) {
        "1" { $finalVersion = $optPatch }
        "2" { $finalVersion = $optMinor }
        "3" { $finalVersion = $optMajor }
        "4" {
            $custom = Read-Host "Bitte Versionsnummer eingeben (z. B. $optPatch)"
            $finalVersion = $custom.Trim().TrimStart('v')
        }
        "0" {
            Write-Info "Release-Vorgang abgebrochen."
            exit 0
        }
        default {
            Write-Err "Ungueltige Auswahl!"
            exit 1
        }
    }
}

$finalVersion = $finalVersion.Trim().TrimStart('v')
if (-not ($finalVersion -match '^\d+\.\d+\.\d+(-[a-zA-Z0-9.]+)?$')) {
    Write-Err "Ungueltiges Versionsformat: '$finalVersion'. Erwartet wird z.B. 2.7.1"
    exit 1
}

Write-Success "Ziel-Version festgelegt: v$finalVersion"

# ------------------------------------------------------------------------------
# 3. Optional: Commit-Nachricht abfragen
# ------------------------------------------------------------------------------
$defaultCommitMsg = "chore(release): bump version to $finalVersion"
$commitMsg = $defaultCommitMsg

if (-not $NoPrompt) {
    $inputMsg = Read-Host "`nCommit-Nachricht [Enter fuer '$defaultCommitMsg']"
    if ($inputMsg -and $inputMsg.Trim().Length -gt 0) {
        $commitMsg = $inputMsg.Trim()
    }
}

# ------------------------------------------------------------------------------
# 4. package.json aktualisieren
# ------------------------------------------------------------------------------
Write-Step "1/5" "Aktualisiere package.json auf v$finalVersion..."

# Sauberes Ersetzen mit Regex, um Formatierung und Einrückung zu erhalten (strikt ohne UTF-8 BOM!)
$updatedJson = $rawJson -replace '("version"\s*:\s*")[^"]+(")', "`${1}$finalVersion`${2}"
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($pkgPath, $updatedJson, $utf8NoBom)
Write-Success "package.json erfolgreich aktualisiert."

# ------------------------------------------------------------------------------
# 5. Git Commit & Tagging
# ------------------------------------------------------------------------------
Write-Step "2/5" "Git Status erfassen und Commit erstellen..."

git add -A
$status = git status --porcelain
if ($status) {
    git commit -m "$commitMsg"
    Write-Success "Git-Commit erstellt: '$commitMsg'"
} else {
    Write-Info "Keine Dateiaenderungen zu committen."
}

# Tag erstellen
$tagName = "v$finalVersion"
$existingTag = git tag -l $tagName
if ($existingTag) {
    Write-Info "Tag $tagName existiert bereits, ueberspringe Tag-Erstellung."
} else {
    git tag -a $tagName -m "Release $tagName"
    Write-Success "Git-Tag erstellt: $tagName"
}

# ------------------------------------------------------------------------------
# 6. Git Push zu GitHub
# ------------------------------------------------------------------------------
Write-Step "3/5" "GitHub Remote Push..."

$doPush = $Push
if (-not $doPush -and -not $NoPrompt) {
    $pushChoice = Read-Host "`nJetzt zu GitHub pushen (origin main & Tags)? [Y/n, Enter=Y]"
    if (-not $pushChoice -or $pushChoice.Trim().ToLower() -eq 'y') {
        $doPush = $true
    }
}

if ($doPush) {
    Write-Info "Pushe 'main' zu origin..."
    git push origin main
    Write-Info "Pushe Tag '$tagName' zu origin..."
    git push origin $tagName
    Write-Success "Branch und Tags erfolgreich zu GitHub gepusht!"
} else {
    Write-Info "Git-Push uebersprungen. Kann spaeter mit 'git push origin main --tags' nachgeholt werden."
}

# ------------------------------------------------------------------------------
# 7. Offline EXE Build
# ------------------------------------------------------------------------------
Write-Step "4/5" "Offline EXE Build konfigurieren..."

$selectedBuild = $BuildType
if (-not $selectedBuild -and -not $NoPrompt) {
    Write-Host ""
    Write-Host "Welcher Offline-Build soll erstellt werden?" -ForegroundColor Yellow
    Write-Host "  [1] Portable EXE (Standalone, laeuft ohne Installation) [Standard]"
    Write-Host "  [2] Setup Installer (Klassische Windows-Installation)"
    Write-Host "  [3] Beide (Portable EXE + Setup Installer)"
    Write-Host "  [4] Kein Build (nur Versionieren & Git)"

    $bChoice = Read-Host "`nAuswahl [1/2/3/4, Enter=1]"
    if (-not $bChoice) { $bChoice = "1" }

    switch ($bChoice.Trim()) {
        "1" { $selectedBuild = "portable" }
        "2" { $selectedBuild = "setup" }
        "3" { $selectedBuild = "both" }
        "4" { $selectedBuild = "none" }
        default { $selectedBuild = "portable" }
    }
}

if ($selectedBuild -and $selectedBuild -ne 'none') {
    Write-Step "5/5" "Starte Build-Prozess fuer Typ: $selectedBuild..."

    # 1. Typecheck
    Write-Info "Fuehre TypeScript Typecheck aus..."
    npm run typecheck
    if ($LASTEXITCODE -ne 0) {
        Write-Err "Typecheck fehlgeschlagen!"
        exit $LASTEXITCODE
    }
    Write-Success "Typecheck erfolgreich."

    # 2. Build renderer
    Write-Info "Erstelle Renderer- und Main-Bundles mit Vite..."
    npm run build:renderer
    if ($LASTEXITCODE -ne 0) {
        Write-Err "Vite-Build fehlgeschlagen!"
        exit $LASTEXITCODE
    }
    Write-Success "Vite-Build erfolgreich."

    # 3. Packaging mit electron-builder
    Write-Info "Erstelle Offline-EXE mit electron-builder ($selectedBuild)..."
    switch ($selectedBuild) {
        "portable" {
            npx electron-builder --win portable
        }
        "setup" {
            npx electron-builder --win nsis
        }
        "both" {
            npx electron-builder --win nsis portable
        }
    }

    if ($LASTEXITCODE -ne 0) {
        Write-Err "Electron-Builder Packaging fehlgeschlagen!"
        exit $LASTEXITCODE
    }
    Write-Success "Packaging erfolgreich abgeschlossen."
} else {
    Write-Info "EXE-Build uebersprungen."
}

# ------------------------------------------------------------------------------
# 8. Zusammenfassung & Fertigstellung
# ------------------------------------------------------------------------------
Write-Host ""
Write-Host "==============================================================" -ForegroundColor DarkCyan
Write-Host "              Release v$finalVersion Erfolgreich!             " -ForegroundColor Green
Write-Host "==============================================================" -ForegroundColor DarkCyan

$releaseDir = Join-Path $PSScriptRoot 'release'
if (Test-Path $releaseDir) {
    Write-Host "`nErstellte Artefakte in release\:" -ForegroundColor Cyan
    $files = Get-ChildItem -Path $releaseDir -Filter "*.exe" -File | Where-Object { $_.Name -like "*$finalVersion*" }
    if ($files.Count -eq 0) {
        $files = Get-ChildItem -Path $releaseDir -Filter "*.exe" -File
    }

    foreach ($file in $files) {
        $sizeMB = [math]::Round($file.Length / 1MB, 2)
        $fileName = $file.Name
        Write-Host "  * $fileName ($sizeMB MB)" -ForegroundColor Yellow
    }

    if (-not $NoPrompt) {
        $openFolder = Read-Host "`nRelease-Ordner im Windows Explorer oeffnen? [Y/n, Enter=Y]"
        if (-not $openFolder -or $openFolder.Trim().ToLower() -eq 'y') {
            Invoke-Item $releaseDir
        }
    }
}

Write-Host "`nFertig! [Erfolg]`n" -ForegroundColor Green
