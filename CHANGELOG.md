# Changelog

Alle wichtigen Änderungen an M-Toolbox werden hier dokumentiert. Das Format orientiert sich an [Keep a Changelog](https://keepachangelog.com/de/1.1.0/) und Semantic Versioning.

## [Unreleased]

### Geplant

- Weitere kuratierte Winget-Pakete
- Verbesserte Release- und Community-Dokumentation

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
