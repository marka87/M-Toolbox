# M-Toolbox: Agent & Entwickler Leitfaden (AGENT_GUIDE.md)

Dieses Dokument dient als verbindliche Referenz für **KI-Agenten und Entwickler**, die an **M-Toolbox** (aktuell **v2.5.0**) weiterarbeiten. Es dokumentiert den aktuellen Entwicklungsstand, die Architektur, strikte Entwicklungsregeln sowie kritische Systemdetails (**„Was man nicht anfassen darf!“**).

---

## 1. Projektübersicht & Tech-Stack

- **Projekt:** M-Toolbox – Moderne Windows 11 Desktop-System-Utility-Suite
- **Aktuelle Version:** `v2.5.0`
- **Technologie-Stack:**
  - **Electron:** Version 34 (Main Process, IPC, Node.js Integration)
  - **Frontend:** React 18, TypeScript 5.7, Tailwind CSS, Framer Motion, Lucide Icons
  - **Bundler:** Vite 6
  - **Datenbank:** SQLite (`better-sqlite3`) für persistente 24h-RAM-Historie und Telemetrie
  - **Betriebssystem-Integration:** Windows 11 APIs, PowerShell, WMI/CIM, ACPI (`root/wmi:BatteryStatus`), PnPUtil, Winget
  - **Design-System:** Windows 11 Fluent Dark UI 2.0 (angepasst an Windows-Designsprache mit Mica/Akryl-Look)

---

## 2. Kritische Regeln & Tabuzonen („WAS MAN NICHT ANFASSEN DARF!“)

### ⚠️ TABU 1: Pfadauflösung & Virtuelles Laufwerk `A:\` (`vite.config.ts`)
- **Kontext:** Das Projekt wird auf dem virtuellen Laufwerk `A:\M-Toolbox` bearbeitet, welches über Windows `subst A: C:\git` angebunden ist (oder direkt im Workspace).
- **Problem:** Chromium und Node.js lösen Symlinks und subst-Laufwerke physisch nach `C:\git\M-Toolbox` auf. Wenn Vite die Root-Pfade mit primitivem `__dirname` definiert, stuft Vite Frontend-Dateien als „außerhalb des Projekt-Roots“ ein und schickt unkompilierten Roh-TSX-Code an den Browser (führt zu fatalen Syntaxfehlern wie `missing ) after argument list`).
- **Verbindliche Regel:**
  In `vite.config.ts` **MUSS** die native reale Pfadauflösung zwingend beibehalten werden:
  ```ts
  const projectRoot = fs.existsSync(__dirname) ? fs.realpathSync.native(__dirname) : __dirname
  ```
  ❌ **Niemals auf einfaches `__dirname` zurückbauen!**

### ⚠️ TABU 2: Node.js Umgebung & Subprozess-Pfade
- **Kontext:** Auf dem Entwicklungssystem ist Node.js oft portabel unter `$env:LOCALAPPDATA\Programs\NodeJS` installiert und Administratorrechte sind eingeschränkt.
- **Verbindliche Regel:**
  - Bei der Ausführung von npm- oder Node-Befehlen in PowerShell-Subshells muss der Pfad immer vorangestellt werden:
    ```powershell
    $env:Path = "$env:LOCALAPPDATA\Programs\NodeJS;" + $env:Path; npm.cmd run <script>
    ```
  - Die Umgebungsvariable `ELECTRON_RUN_AS_NODE` darf beim Start von Electron nicht gesetzt sein (wird durch `dev.cmd` sichergestellt).

### ⚠️ TABU 3: Keine Mockups / Keine Fake-Implementierungen
- M-Toolbox enthält **keine Dummy-Daten oder Platzhalter**.
- Jede Funktion muss echt sein: echte Abfragen via ACPI, PnPUtil, WMI, PowerShell, Win32-APIs, Winget oder Registry.
- Wenn für eine Aktion Administratorrechte erforderlich sind (z. B. `pnputil /scan-devices` oder DISM), muss ein sauberer Fehler abgefangen und der Benutzer verständlich informiert werden – niemals eine Fake-Erfolgsmeldung vorgaukeln!

### ⚠️ TABU 4: Systemschutz & Treiber-Sicherheit
- Niemals Systemdateien unter `C:\Windows\System32` oder Treiber im `DriverStore` manuell manipulieren oder löschen.
- Treiber-Exporte erfolgen ausschließlich über sichere Windows-Bordmittel (`pnputil /export-driver`).
- Registry-Änderungen dürfen nur im Benutzerbereich (`HKCU`) durchgeführt werden.

### ⚠️ TABU 5: Batteriemonitoring, WMI-Polling & Ressourcen-Schonung (Keine CPU-Hog-Loops)
- **Kontext:** Das Akku- und Watt-Monitoring (`battery.service.ts`) greift auf WMI (`root/wmi:BatteryStatus`) und Performance-Counter zu.
- **Verbindliche Regeln:**
  - **Messintervall:** Das Polling-Intervall darf **niemals** unter 5–8 Sekunden liegen. Das Standardintervall ist fest auf **8000 ms (8 Sekunden)** eingestellt, um CPU-Leerlaufzeiten von über 97 % zu garantieren.
  - **Hardware-Caching & Fehlerbehandlung:** Desktop-Systeme ohne Akku dürfen WMI nicht in Endlosschleifen abfragen. `hasBatteryHardware` wird gecacht; alle WMI-Calls müssen in globalen `try/catch`-Blöcken gekapselt sein, damit niemals ein unbehandelter Fehler den IPC-Kanal blockiert.

### ⚠️ TABU 6: Windows PowerShell & Native API Besonderheiten
- **Befehlsketten:** In Windows PowerShell **immer Semikolon (`;`)** zur Verkettung von Befehlen nutzen, niemals bash-artiges `&&` (führt unter Windows PowerShell 5.1 zu Syntax- und Abbruchfehlern).
- **Executable Extensions:** Node- und npm-Tools im Windows Terminal immer mit `.cmd` ansprechen (`npm.cmd run typecheck`).

---

## 3. Modul-Roadmap & Aktueller Implementierungsstatus

| Modul | Name | Version | Status | Kernfunktionen |
| :--- | :--- | :--- | :--- | :--- |
| **Modul 1** | **Dashboard** | `v1.0.0` | ✅ Fertig | System-Specs (CPU, RAM, GPU, OS), Echtzeit-Metriken-Stream ohne Polling-Overhead, Fluent Cards |
| **Modul 2** | **Software Center** | `v1.1.0` | ✅ Fertig | Kuratierter Katalog (88 Pakete, 7 Kategorien), Winget Package List, Update-Erkennung, Silent Batch Install/Uninstall |
| **Modul 3** | **Backup & Migration** | `v2.2.0` | ✅ Fertig | Vollständige Systemmigration & Reinstall-Archiv (`.mtoolbox`), Winget-Pakete, Registry, App-Daten, Browser-Profile, Preview & Restore-Assistent |
| **Modul 5** | **Cleanup Center** | `v1.4.0` | ✅ Fertig | Temp-Files, Windows Update Cache, Crash Dumps, Browser Caches, Papierkorb, Speicher-Analyse |
| **Modul 6** | **Repair Center** | `v1.5.0` | ✅ Fertig | SFC /scannow, DISM RestoreHealth, Win Update Reset, Print Spooler Repair, Network Stack Reset, Explorer/Search/Store |
| **Modul 7** | **Tweaks** | `v1.6.0` | ✅ Fertig | Windows 11 Explorer Tweaks, Telemetrie minimieren, Kontextmenü klassisch, Gaming Tweaks, Taskbar-Ausrichtung |
| **Modul 9** | **Advanced Tools** | `v1.8.0` | ✅ Fertig | Startup Manager (StartupApproved an/aus), Hosts File Editor |
| **Modul 10**| **Settings** | `v1.9.0` | ✅ Fertig | Fluent Design (Dark/Light/System), 5 Akzentfarben, Windows-Autostart, GitHub Updates API, AppData & Cache-Verwaltung, System-Info |
| **Modul 12**| **Batterie-Manager** | `v2.3.0` | ✅ Fertig | ACPI Live-Wattage (Lade-/Entladerate in W), Zellspannung, Kapazitäts- und Verschleißgrad (Wh), Energieschemas, HTML-Akkubericht, akkuschonender 8s-Timer |
| **Modul 13**| **Desktop Mini-HUD** | `v2.4.0` | ✅ Fertig | Transparentes 2×2 Overlay-Fenster, Live-CPU/RAM/GPU/Akku (Wattage), Always-on-Top, Drag & Drop |

Entfernt (zu wenig Nutzen gegenüber Windows-Bordmitteln): Driver Center (Treiber-Export bleibt in Backup & Migration), Netzwerk Toolkit, RAM Guardian, Gaming-Master-Modus, Tools-Launcher, Drain-Inspektor.

---

## 4. Automatisches Versionierungs- & Git-Schema

Das Projekt nutzt striktes **Semantic Versioning (SemVer)**:
- **MAJOR-Bump (`X.0.0`):** Grundlegende Architektur- und UI-Meilensteine (z. B. `2.0.0` Fluent UI 2.0).
- **MINOR-Bump (`X.Y.0`):** Bei der Fertigstellung eines neuen Hauptmoduls (z. B. `2.1.0` für RAM Guardian, `2.2.0` für Batterie & Migration, `2.3.0` für Watt-Monitoring & Drain-Inspektor).
- **PATCH-Bump (`X.Y.Z`):** Bei Fehlerbehebungen, Detailverbesserungen oder Zwischen-Features.

### Standard-Release-Workflow nach Änderungen:
1. Version in `package.json` anpassen.
2. `CHANGELOG.md`, `README.md` und `ROADMAP.md` aktualisieren.
3. TypeScript Validierung ausführen:
   ```powershell
   npm.cmd run typecheck
   ```
4. Production Builds erzeugen (optional bei Release):
   ```powershell
   npm.cmd run build:renderer ; npm.cmd run build:setup ; npm.cmd run build:portable
   ```
5. Git Commit & Push:
   ```powershell
   git add .
   git commit -m "feat: release vX.Y.Z - <Beschreibung>"
   git push origin main
   ```

---

## 5. Architektur & Code-Struktur

```text
M-Toolbox/
├── src/
│   ├── main/                  # Electron Main Process
│   │   ├── index.ts           # BrowserWindow, Lifecycle, Safe Mode
│   │   ├── ipc/               # Registrierung aller IPC-Handler
│   │   │   └── index.ts
│   │   └── services/          # Backend-Dienste (Native System-Logik)
│   │       ├── advanced.service.ts
│   │       ├── backup.service.ts
│   │       ├── battery.service.ts        # ACPI Watt-Monitoring, Health, Energieschemas
│   │       ├── cleanup.service.ts
│   │       ├── dashboard.service.ts
│   │       ├── database.service.ts       # SQLite better-sqlite3 Instanz & Schemas
│   │       ├── driver.service.ts         # Treiber-Inventar & Export für Backup/Reinstall
│   │       ├── powershell.service.ts     # Gekapselte sichere PowerShell-Pipeline
│   │       ├── reinstall.service.ts      # Migration & .mtoolbox Reinstall-Archive
│   │       ├── repair.service.ts
│   │       ├── settings.service.ts
│   │       ├── software.service.ts
│   │       ├── tweak.service.ts
│   │       └── widget.service.ts         # Desktop Mini-HUD Fenstersteuerung & Bounds
│   ├── preload/               # Preload-Skript (Sichere ContextBridge)
│   │   └── index.ts           # Exponiert window.mToolbox.* typisiert
│   ├── shared/                # Gemeinsam genutzter Code
│   │   ├── channels.ts        # IPC_CHANNELS Konstanten
│   │   └── types.ts           # TypeScript Interfaces & Typdefinitionen
│   └── renderer/              # React 18 Frontend
│       └── src/
│           ├── assets/        # CSS, Schriftarten
│           ├── components/    # Wiederverwendbare UI-Komponenten
│           │   ├── layout/    # Titlebar, Sidebar
│           │   └── ui/        # Card, DeviceCard, ThemeSelector, AccentColorPicker, etc.
│           ├── hooks/         # Custom Hooks
│           │   ├── useAdvancedTools.ts
│           │   ├── useBackupMigration.ts
│           │   ├── useBattery.ts
│           │   ├── useCleanup.ts
│           │   ├── useDashboard.ts
│           │   ├── useDriver.ts
│           │   ├── useNetwork.ts
│           │   ├── useRamGuardian.ts
│           │   ├── useBloatware.ts
│           │   ├── usePerformance.ts
│           │   ├── useRepair.ts
│           │   ├── useSettings.ts
│           │   ├── useSoftware.ts
│           │   └── useTweaks.ts
│           ├── pages/         # Seiten
│           │   ├── AdvancedPage.tsx
│           │   ├── BackupMigrationPage.tsx
│           │   ├── BatteryPage.tsx
│           │   ├── CleanupPage.tsx
│           │   ├── DashboardPage.tsx
│           │   ├── DriverPage.tsx
│           │   ├── NetworkPage.tsx
│           │   ├── RAMGuardianPage.tsx
│           │   ├── RepairPage.tsx
│           │   ├── SettingsPage.tsx
│           │   ├── SoftwarePage.tsx
│           │   └── TweaksPage.tsx
│           ├── App.tsx        # Routing / Modulwechsel
│           └── main.tsx       # React Root
├── release/                   # Gebaute Setup- & Portable-Dateien
├── package.json
├── vite.config.ts             # Vite & Electron Konfiguration (Beachte TABU 1)
├── AGENT_GUIDE.md             # Dieses Dokument
├── CHANGELOG.md               # Keep-a-Changelog Versionshistorie
├── ROADMAP.md                 # Modul- & Feature-Roadmap
└── README.md                  # Hauptdokumentation
```

---

## 6. Wichtige IPC-Kanäle & APIs

- **`window.mToolbox.dashboard`:** `getSystemInfo()`, `startMetricsStream()`, `stopMetricsStream()`, `onLiveMetrics()`
- **`window.mToolbox.software`:** `getCatalog()`, `getInstalled()`, `getUpdates()`, `install()`, `uninstall()`, `upgrade()`, `upgradeAll()`, `search()`, `onProgress()`
- **`window.mToolbox.backup`:** `createBackup()`, `restoreBackup()`, `previewBackup()`, `listLocalBackups()`, `selectBackupFile()`, `saveBackupDialog()`, `onProgress()`
- **`window.mToolbox.reinstall`:** `discover()`, `create()`, `preview()`, `restore()`, `selectFile()`, `saveDialog()`, `history()`, `onProgress()`
- **`window.mToolbox.cleanup`:** `scan()`, `clean()`, `openStorageSense()`, `onProgress()`
- **`window.mToolbox.bloatware`:** `scan()`, `uninstallSingle(appId)`, `uninstallBatch(appIds)`, `onProgress()`
- **`window.mToolbox.repair`:** `getHealth()`, `runAction()`, `restartAsAdmin()`, `onProgress()`
- **`window.mToolbox.tweaks`:** `getAll()`, `setTweak()`, `applyRecommended()`, `restartExplorer()`
- **`window.mToolbox.advanced`:** `getStartupItems()`, `setStartupItemEnabled()`, `deleteStartupItem()`, `getHostsFile()`, `saveHostsFile()`
- **`window.mToolbox.battery`:** `getInfo()`, `setPowerPlan()`, `generateReport()`
- **`window.mToolbox.settings`:** `getSettings()`, `saveSettings()`, `checkUpdates()`, `getAppInfo()`, `openUserDataFolder()`, `clearCache()`, `resetSettings()`
- **`window.mToolbox.widget`:** `toggle()`, `getState()`, `setAlwaysOnTop()`, `restoreMainWindow()`, `close()`
- **`window.mToolbox.system`:** `minimize()`, `maximize()`, `close()`, `openExternal()`
