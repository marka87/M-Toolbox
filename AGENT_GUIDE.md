# M-Toolbox: Agent & Entwickler Leitfaden (AGENT_GUIDE.md)

Dieses Dokument dient als verbindliche Referenz für **KI-Agenten und Entwickler**, die an **M-Toolbox** weiterarbeiten. Es dokumentiert den aktuellen Entwicklungsstand, die Architektur, strikte Entwicklungsregeln sowie kritische Systemdetails (**„Was man nicht anfassen darf!“**).

---

## 1. Projektübersicht & Tech-Stack

- **Projekt:** M-Toolbox – Moderne Windows 11 Desktop-System-Utility-Suite
- **Technologie-Stack:**
  - **Electron:** Version 34 (Main Process, IPC, Node.js Integration)
  - **Frontend:** React 18, TypeScript, Tailwind CSS, Framer Motion, Lucide Icons
  - **Bundler:** Vite 6
  - **Datenbank:** SQLite (`better-sqlite3`)
  - **Betriebssystem-Integration:** Windows 11 APIs, PowerShell, WMI/CIM, PnPUtil, Winget
  - **Design-System:** Windows 11 Fluent Dark UI (angepasst an Windows-Designsprache mit Mica/Akryl-Look)

---

## 2. Kritische Regeln & Tabuzonen („WAS MAN NICHT ANFASSEN DARF!“)

### ⚠️ TABU 1: Pfadauflösung & Virtuelles Laufwerk `A:\` (`vite.config.ts`)
- **Kontext:** Das Projekt wird auf dem virtuellen Laufwerk `A:\M-Toolbox` bearbeitet, welches über Windows `subst A: C:\git` angebunden ist.
- **Problem:** Chromium und Node.js lösen Symlinks und subst-Laufwerke physisch nach `C:\git\M-Toolbox` auf. Wenn Vite die Root-Pfade mit primitivem `__dirname` definiert, stuft Vite Frontend-Dateien als „außerhalb des Projekt-Roots“ ein und schickt unkompilierten Roh-TSX-Code an den Browser (führt zu fatalen Syntaxfehlern wie `missing ) after argument list`).
- **Verbindliche Regel:**
  In `vite.config.ts` **MUSS** die native reale Pfadauflösung zwingend beibehalten werden:
  ```ts
  const projectRoot = fs.existsSync(__dirname) ? fs.realpathSync.native(__dirname) : __dirname
  ```
  ❌ **Niemals auf einfaches `__dirname` zurückbauen!**

### ⚠️ TABU 2: Node.js Umgebung & Subprozess-Pfade
- **Kontext:** Auf dem Entwicklungssystem ist Node.js portabel unter `$env:LOCALAPPDATA\Programs\NodeJS` installiert und Administratorrechte sind eingeschränkt.
- **Verbindliche Regel:**
  - Bei der Ausführung von npm- oder Node-Befehlen in PowerShell-Subshells muss der Pfad immer vorangestellt werden:
    ```powershell
    $env:Path = "$env:LOCALAPPDATA\Programs\NodeJS;" + $env:Path; npm run <script>
    ```
  - Die Umgebungsvariable `ELECTRON_RUN_AS_NODE` darf beim Start von Electron nicht gesetzt sein (wird durch `dev.cmd` sichergestellt).

### ⚠️ TABU 3: Keine Mockups / Keine Fake-Implementierungen
- M-Toolbox enthält **keine Dummy-Daten oder Platzhalter**.
- Jede Funktion muss echt sein: echte Abfragen via PnPUtil, WMI, PowerShell, Winget oder Win32-Registry.
- Wenn für eine Aktion Administratorrechte erforderlich sind (z. B. `pnputil /scan-devices`), muss ein sauberer Fehler abgefangen und der Benutzer verständlich informiert werden – niemals eine Fake-Erfolgsmeldung vorgaukeln!

### ⚠️ TABU 4: Systemschutz & Treiber-Sicherheit
- Niemals Systemdateien unter `C:\Windows\System32` oder Treiber im `DriverStore` manuell manipulieren oder löschen.
- Treiber-Exporte erfolgen ausschließlich über sichere Windows-Bordmittel (`pnputil /export-driver`).
- Registry-Änderungen dürfen nur im Benutzerbereich (`HKCU`) durchgeführt werden.

---

## 3. Modul-Roadmap & Aktueller Implementierungsstatus

| Modul | Name | Version | Status | Kernfunktionen |
| :--- | :--- | :--- | :--- | :--- |
| **Modul 1** | **Dashboard** | `v1.0.0` | ✅ Fertig | System-Specs (CPU, RAM, GPU, OS), Echtzeit-Metriken-Stream ohne Polling-Overhead, Fluent Cards |
| **Modul 2** | **Software Center** | `v1.1.0` | ✅ Fertig | Kuratierter Katalog (7 Kategorien), Winget Package List, Update-Erkennung, Silent Batch Install/Uninstall |
| **Modul 3** | **Backup & Restore** | `v1.2.0` | ✅ Fertig | Winget-Paketliste, Explorer-Settings, User-Fonts (Base64), Wallpaper (SPI), PowerShell-Module |
| **Modul 4** | **Driver Center** | `v1.3.1` | ✅ Fertig | Geräte- & OEM-Treiberinventar, Problemcode-Diagnose, 1-Klick Export, GPU-Check, Windows Update Treibersuche |
| **Modul 5** | **Cleanup Center** | `v1.4.0` | ✅ Fertig | Temp-Files, Windows Update Cache, Crash Dumps, Browser Caches, Papierkorb, Speicher-Analyse |
| **Modul 6** | **Repair Center** | `v1.5.0` | ✅ Fertig | SFC /scannow, DISM Health Restore, Win Update Reset, Print Spooler Repair, Network Stack Reset, AppX Re-Register |
| **Modul 7** | **Tweaks** | `v1.6.0` | ✅ Fertig | Windows 11 Explorer Tweaks, Telemetrie minimieren, Kontextmenü klassisch, Gaming Tweaks, Taskbar-Ausrichtung |
| **Modul 8** | **Netzwerk Toolkit**| `v1.7.0` | ⏳ **NÄCHSTES** | Ping/Latency Test, DNS Benchmark, Adapter Speed/IP, Port Scanner, Flush DNS |
| **Modul 9** | **Advanced Tools** | `v1.8.0` | 📋 Geplant | God Mode Shortcuts, Windows Tools Launcher, Startup Manager, Hosts File Editor |
| **Modul 10**| **Settings** | `v1.9.0` | 📋 Geplant | Theme (Dark/Light/System), Autostart M-Toolbox, Update-Check, Log-Dateien, Über |

---

## 4. Automatisches Versionierungs- & Git-Schema

Das Projekt nutzt striktes **Semantic Versioning (SemVer)**:
- **MINOR-Bump (`1.X.0`):** Bei der Fertigstellung eines neuen Hauptmoduls (z. B. `1.3.0` für Modul 4, `1.4.0` für Modul 5).
- **PATCH-Bump (`1.X.Y`):** Bei Fehlerbehebungen, Detailverbesserungen oder Zwischen-Features (z. B. `1.3.1` für GPU-Check & Online-Treibersuche).

### Standard-Release-Workflow nach Änderungen:
1. Version in `package.json` anpassen.
2. TypeScript Validierung ausführen:
   ```powershell
   $env:Path = "$env:LOCALAPPDATA\Programs\NodeJS;" + $env:Path; npm run typecheck
   ```
3. Vite & Electron Bundle prüfen:
   ```powershell
   $env:Path = "$env:LOCALAPPDATA\Programs\NodeJS;" + $env:Path; npm run build:renderer
   ```
4. Git Commit & annotierter Tag:
   ```powershell
   git add .
   git commit -m "feat: release vX.Y.Z - <Beschreibung>"
   git tag -a vX.Y.Z -m "Release vX.Y.Z: <Beschreibung>"
   git push --follow-tags
   ```

---

## 5. Architektur & Code-Struktur

```
A:\M-Toolbox\
├── src\
│   ├── main\                  # Electron Main Process
│   │   ├── index.ts           # BrowserWindow, Lifecycle
│   │   ├── ipc\               # Registrierung aller IPC-Handler
│   │   │   └── index.ts
│   │   └── services\          # Backend-Dienste (Native System-Logik)
│   │       ├── dashboard.service.ts
│   │       ├── software.service.ts
│   │       ├── backup.service.ts
│   │       ├── driver.service.ts
│   │       ├── cleanup.service.ts
│   │       ├── repair.service.ts
│   │       └── tweak.service.ts
│   ├── preload\               # Preload-Skript (Sichere ContextBridge)
│   │   └── index.ts           # Exponiert window.mToolbox.*
│   ├── shared\                # Gemeinsam genutzter Code
│   │   ├── channels.ts        # IPC_CHANNELS Konstanten
│   │   └── types.ts           # TypeScript Interfaces & Typen
│   └── renderer\              # React 18 Frontend
│       └── src\
│           ├── assets\        # CSS, Schriftarten
│           ├── components\    # Wiederverwendbare UI-Komponenten
│           │   ├── layout\    # Titlebar, Sidebar
│           │   └── ui\        # Card, DeviceCard, TweakToggleCard, ExplorerRestartBanner, etc.
│           ├── hooks\         # Custom Hooks (useDashboard, useSoftware, useBackup, useDriver, useCleanup, useRepair, useTweaks)
│           ├── pages\         # Seiten (DashboardPage, SoftwarePage, BackupPage, DriverPage, CleanupPage, RepairPage, TweaksPage)
│           ├── App.tsx        # Routing / Modulwechsel
│           └── main.tsx       # React Root
├── package.json
├── vite.config.ts             # Vite & Electron Konfiguration (Beachte TABU 1)
├── AGENT_GUIDE.md             # Dieses Dokument
└── README.md
```

---

## 6. Wichtige IPC-Kanäle & APIs

- **`window.mToolbox.dashboard`:** `getSystemInfo()`, `startMetricsStream()`, `onLiveMetrics()`
- **`window.mToolbox.software`:** `getCatalog()`, `getInstalled()`, `getUpdates()`, `install()`, `uninstall()`, `upgrade()`, `upgradeAll()`
- **`window.mToolbox.backup`:** `createBackup()`, `restoreBackup()`, `previewBackup()`, `listLocalBackups()`, `selectBackupFile()`, `saveBackupDialog()`
- **`window.mToolbox.driver`:** `getData()`, `exportDrivers()`, `selectExportDir()`, `scanHardware()`, `openDeviceManager()`, `restartDevice()`, `getGpuInfo()`, `checkWindowsUpdate()`, `searchOnline()`
- **`window.mToolbox.cleanup`:** `scan()`, `clean()`, `getDiskSpace()`
- **`window.mToolbox.repair`:** `getSystemHealth()`, `executeAction()`, `isElevated()`, `restartAsAdmin()`, `onRepairLog()`
- **`window.mToolbox.tweaks`:** `getAll()`, `setTweak()`, `applyRecommended()`, `restartExplorer()`
- **`window.mToolbox.system`:** `minimize()`, `maximize()`, `close()`, `openExternal()`



