# Changelog

Alle wichtigen Änderungen an M-Toolbox werden hier dokumentiert. Das Format orientiert sich an [Keep a Changelog](https://keepachangelog.com/de/1.1.0/) und Semantic Versioning.

## [2.5.0] - 2026-09-24

### Hinzugefügt

- **1-Klick Performance & Gaming-Modus**:
  - Prominente Master-Card an der Spitze des Tweaks-Bereichs mit 1-Klick Master-Toggle.
  - Minimiert Systemlatenzen und maximiert FPS: Deaktiviert visuelle Windows-Effekte (`VisualFXSetting = 2`), Fensterminimierungs-Animationen (`MinAnimate = 0`) und Fenstertransparenzen (`EnableTransparency = 0`).
  - Schaltet Xbox Game DVR Hintergrundaufzeichnungen ab (`AppCaptureEnabled = 0`, `GameDVR_Enabled = 0`).
  - Pausiert den Windows-Suchindexer (`wsearch`) während des Gaming-Modus zur Entlastung von SSD und CPU.
  - Aktiviert sofort das Windows-Höchstleistungsprofil (High Performance Scheme mit automatischer Modern-Standby Duplizierung).
  - Volle Wiederherstellbarkeit: Beim Deaktivieren werden alle ursprünglichen Einstellungen und das zuvor aktive Energieschema exakt auf den Ausgangszustand zurückgesetzt.

- **Kuratierte Energie-Profile im Batterie-Manager**:
  - 3 interaktive Schnellprofile für Laptops und Desktops:
    - 🌱 **Eco (Stromsparmodus)**: Deckelt die maximale CPU-Taktfrequenz auf Akkubetrieb auf 80 % (`PROCFREQMAX`), reduziert Display-Timeout auf 3 Minuten und schaltet auf das Energiesparschema um.
    - ⚖️ **Ausbalanciert**: Volle CPU-Dynamik (100 %) bei 5 Minuten Display-Timeout.
    - 🚀 **Höchstleistung**: Permanente Maximaltaktung, kein Throttling und 15 Minuten Display-Timeout.
  - Unterstützt Windows 11 Modern Standby (CS / Connected Standby) durch automatisches Entsperren und Duplizieren verborgener OEM-Schemas (`powercfg -duplicatescheme`).

- **Bloatware-Erkennung & -Entfernung im Cleanup Center**:
  - Neuer Reiter **"Windows Bloatware"** direkt neben dem Dateimüll-Cleaner.
  - Scannt installierte Appx- und UWP-Pakete per PowerShell mit systemweiter und lokaler Erkennung.
  - Sicherheitsklassifizierung mit visuellen Ampelfarben:
    - 🟢 **Sicher entfernbar** (vorinstallierte Werbe-Apps, MSN Feeds, News, TikTok, Spotify-Shortcuts, Candy Crush, Xing etc.)
    - 🟡 **Optional** (nicht-kritische Microsoft-Zusatztools wie Skype, Xbox Apps, To Do, Wetter)
    - 🔴 **Systemrelevant / Geschützt** (Microsoft Store, Rechner, Windows Fotos, Systemkomponenten – standardmäßig gegen versehentliches Löschen geschützt)
  - 1-Klick-Button "Alle sicheren Apps wählen" für risikofreie Systembereinigung in Sekunden.
  - Einzelne Deinstallation oder Batch-Deinstallation mit Live-Fortschrittsbalken und detaillierter Bestätigungsabfrage.

## [2.4.1] - 2026-09-24

### Hinzugefügt

- **Software Center - Online Winget-Katalogsuche**:
  - Wenn eine gesuchte Anwendung nicht im kuratierten Katalog vorkommt (oder wenn direkt nach externen Paketen gesucht werden soll), kann direkt per Button oder per `Enter`-Taste das gesamte offizielle Microsoft Winget-Repository online durchsucht werden.
  - Gefundene Online-Pakete werden nahtlos mit Icon, Versionsnummer und Quelle dargestellt und können mit einem Klick installiert werden.
  - Erkennung bereits auf dem Rechner installierter Versionen auch bei Online-Suchergebnissen.

### Geändert / Behoben

- **Standard-Listenansicht**:
  - Software Center und Driver Center starten nun standardmäßig in der übersichtlichen, kompakten Listenansicht (`compact`).
- **Software Center UI-Kollisionsfix**:
  - Behoben: Badges kollidierten mit Checkboxen und Texten auf schmalen Karten (`media_1790232865463.png`). Checkboxen, App-Icons, Titel und Badges verfügen nun über dedizierte Breitenbegrenzungen (`shrink-0`, `min-w-0 flex-1`, Textkürzungen).
  - Behoben: Aktionsbuttons ("Deinstallieren" / "Installieren") überlappten den Kachelrand im Kachel-Modus (`media_1790232888276.png`). Die Buttons passen sich nun dynamisch der Kachelbreite an, kürzen überlange Texte sauber und nutzen in Kacheln die kompaktere Beschriftung "Löschen".
- **Cleanup Center - Windows Update Cache Reparatur**:
  - Behoben: Der Windows Update Cache (`C:\Windows\SoftwareDistribution\Download`) wurde zuvor durch Dateisperren der Windows-Update-Dienste (`wuauserv`, `bits`, `dosvc`) und fehlende Berechtigungen übersprungen.
  - Automatische UAC-Erhöhung und sauberes Anhalten der sperrenden Windows-Dienste vor dem Löschen des Download-Ordners sowie sicherer Neustart der Dienste.
  - Exakte Vorher-/Nachher-Messung der freigegebenen Bytes und gelöschten Dateien.

## [2.4.0] - 2026-09-23

### Hinzugefügt

- **Desktop Mini-HUD Widget (Kompakt-Kachel 2×2)**: Frei bewegliches, transparentes Overlay-Fenster (`240 × 120 px`) im Windows 11 Fluent Glassmorphism-Design zur dauerhaften Live-Überwachung von CPU, RAM, GPU und Akku.
- **Always-on-Top & Drag & Drop**: Vollständig frei per Maus auf dem Desktop positionierbar (`-webkit-app-region: drag`) mit automatischem Positions-Gedächtnis und Umschaltung auf Always-on-Top (📌 Pin).
- **Live GPU-Performance Monitoring**: Asynchrones, ressourcenschonendes Sampling der GPU-Auslastung über native Windows-Performance-Counter (`Win32_PerfFormattedData_GPUPerformanceCounters_GPUEngine`).
- **1-Klick RAM-Bereinigung direkt im Widget**: Schnelles Besen-Icon zur sofortigen Freigabe von Arbeitsspeicher (`EmptyWorkingSet`) mit visueller Erfolgsrückmeldung.
- **Doppelklick-Aktion & Titlebar-Integration**: Neues Tacho-Icon im Fensterkopf von M-Toolbox zum Umschalten des Widgets sowie Doppelklick auf die Widget-Fläche, um das Hauptfenster in den Vordergrund zu holen.

### Geändert / Optimiert

- **Dramatische CPU-Reduktion (< 0,5 %)**:
  - Netzwerkdurchsatz wird nun direkt über das native Windows `netstat -e` ermittelt (kein periodischer PowerShell-Prozess mehr alle 1,5s).
  - GPU-Sampling nutzt direkte `nvidia-smi`-Abfragen (ohne PowerShell) bzw. gedrosselte 6s-Intervalle.
  - Das Mini-HUD ruft Akku-Daten ohne ressourcenintensives Prozess-Sampling ab (`includeDrainProcesses = false`), wodurch keine 250ms-Schleifen im Hintergrund laufen.
  - Caching von Windows-Energieschemata (`powercfg /list`) für 60s.

## [2.3.0] - 2026-09-23

### Hinzugefügt

- **Batterie-Manager Watt-Monitoring**: Echtzeit-Messung der Lade- und Entladerate in Watt (z. B. `-12,9 W` oder `+45,0 W`) sowie der Akkuspannung in Volt direkt über ACPI `root/wmi:BatteryStatus`.
- **Energie-Fresser-Inspektor (Drain-Inspektor)**: Live-Tabelle der ressourcenhungrigsten Anwendungen mit CPU-Auslastung, RAM-Verbrauch und Einstufung der Energieauswirkung (Sehr hoch, Hoch, Moderat, Niedrig).
- **Akkufresser-Warnungen (Drain-Alert)**: Automatische Alarm-Banner bei hoher Entladerate oder CPU-hungrigen Hintergrund-Apps inklusive Direkt-Aktion "App beenden".
- **Akkuschonender 8s-Timer**: Optimiertes 8-Sekunden-Messintervall (über 97 % Leerlaufzeit) mit An/Aus-Schalter zur Vermeidung von Eigenlast.
- **Selbstschutz (Self-Protection)**: Eigene M-Toolbox-Prozesse werden geschützt, mit `Diese App` gekennzeichnet und von Warnungen ausgenommen.

## [2.2.0] - 2026-09-23

### Hinzugefügt

- **Batterie-Manager (Laptop Modus)**: Neues Modul für Akku-Gesundheitsanalyse, Ladezustand, Restlaufzeit, Nenn- und Maximalkapazität in Wh, Verschleißgrad, Nennspannung, Ladezyklen und interaktivem HTML-Akkubericht.
- **Windows-Energieschemas**: Umschalten zwischen Energiesparmodus, Ausbalanciert und Höchstleistung direkt in M-Toolbox.
- **Backup & Migration**: Vollständige Verschmelzung von Backup & Restore und dem Reinstall-Assistenten in ein einheitliches Migrationszentrum mit `.mtoolbox`-Archiven.

## [2.1.0] - 2026-09-23

### Hinzugefügt

- **RAM Guardian**: Neues Arbeitsspeicher-Optimierungsmodul mit Windows-Arbeitsspeicher-Bereinigung (`EmptyWorkingSet`), Top-RAM-Prozessen, Hygiene-Score, 24h-Verlaufshistorie und Autostart-Empfehlungen.

## [2.0.0] - 2026-09-23

### Geändert

- **Meilenstein-Release**: Großes Architektur- und Design-Update auf Fluent UI 2.0 mit optimierter Performance, verbesserter IPC-Pipeline und robuster Fehlerbehandlung.

## [1.9.4] - 2026-09-22

### Hinzugefügt

- Größerer Software-Center-Katalog mit 88 kuratierten Programmen.
- Kategorisierte Katalognavigation und zentriertes Layout.
- Verbesserte Listen-, Karten- und Batch-Auswahl.

## [1.9.3] - 2026-09-22

### Geändert

- Fehlerbehebungen und Verbesserungen am bestehenden Release.

## [1.9.2] - 2026-09-21

### Hinzugefügt

- Driver-Center-GUI-Verbesserungen.
- Software-Center-Ansichtsmodi und erweiterter Katalog.

## [1.9.1] - 2026-09-21

### Behoben

- Winget-Deinstallationsausgabe und Parsing.
- Persistenz von Tweaks.
- DDR5-Erkennung.

## [1.9.0] - 2026-09-20

### Hinzugefügt

- Settings-Modul mit Themes, Akzentfarben, Autostart, Update-Prüfung und Systeminformationen.

## [1.8.0] - 2026-09-19

### Hinzugefügt

- Advanced Tools mit Windows-Tools-Launcher, Autostart-Manager und Hosts-Editor.

## [1.7.0] - 2026-09-18

### Hinzugefügt

- Netzwerk Toolkit mit Adapterdiagnose, Ping, DNS-Benchmark und Port-Scanner.

## [1.6.0] - 2026-09-17

### Hinzugefügt

- Windows-11-Tweaks für Explorer, Datenschutz und Gaming.

## [1.5.0] - 2026-09-16

### Hinzugefügt

- Repair Center mit SFC, DISM, Windows-Update-, Netzwerk-, Spooler- und AppX-Reparaturen.

## [1.4.0] - 2026-09-15

### Hinzugefügt

- Cleanup Center mit temporären Dateien, Caches, Crash Dumps und Papierkorb.

## [1.3.1] - 2026-09-14

### Hinzugefügt

- Driver Center mit Treiberinventar, Export, GPU-Prüfung und Online-Suche.

## [1.3.0] - 2026-09-13

### Hinzugefügt

- Grundlegendes Driver-Center-Modul.

## [1.2.0] - 2026-09-12

### Hinzugefügt

- Backup & Restore für Winget-Pakete und Benutzereinstellungen.

## [1.1.0] - 2026-09-11

### Hinzugefügt

- Software Center mit Winget-Katalog, Installation und Updates.

## [1.0.0] - 2026-09-10

### Hinzugefügt

- Dashboard mit Systeminformationen und Live-Metriken.

[Unreleased]: https://github.com/marka87/M-Toolbox/compare/v1.9.4...HEAD
[1.9.4]: https://github.com/marka87/M-Toolbox/releases/tag/v1.9.4
