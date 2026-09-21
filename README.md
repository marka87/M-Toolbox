# M-Toolbox

> Moderne Windows 11 Desktop System-Utility-Suite auf Basis von Electron, React, TypeScript und Windows-Bordmitteln.

[![Version](https://img.shields.io/badge/Version-1.9.0-blue.svg)](https://github.com/marka87/M-Toolbox)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/Platform-Windows%2011-0078d4.svg)](https://microsoft.com/windows)

---

## 🚀 Übersicht der Module

M-Toolbox besteht aus 10 aufeinander abgestimmten Modulen für Wartung, Bereinigung, Optimierung und Diagnose:

1. **Dashboard** (`v1.0.0`) – Vollständige Systemübersicht (CPU, RAM, GPU, OS) mit ressourcenschonendem Echtzeit-Streaming.
2. **Software Center** (`v1.1.0`) – Grafischer Paketmanager auf Basis von `winget` mit kuratiertem Software-Katalog und Batch-Installationen.
3. **Backup & Restore** (`v1.2.0`) – Granulare Sicherung & Wiederherstellung von Winget-Paketen, Explorer-Einstellungen, User-Fonts, Wallpaper und PowerShell-Modulen.
4. **Driver Center** (`v1.3.1`) – Geräte- & OEM-Treiber-Inventar, Problem-Diagnose, 1-Klick Treiber-Export, GPU-Aktualitätsprüfung und Online-Treibersuche (Microsoft Update-Katalog & Windows Update).
5. **Cleanup Center** (`v1.4.0`) – Temporäre Dateien, Update-Cache, Crash Dumps, Browser-Caches, Papierkorb & Speicherplatz-Analyse.
6. **Repair Center** (`v1.5.0`) – Windows-Systemreparaturen (SFC /scannow, DISM RestoreHealth, Windows Update Reset, Netzwerk-Stack Reset, Spooler & AppX-Reparatur).
7. **Tweaks** (`v1.6.0`) – Windows 11 Oberflächen- & Leistungsoptimierungen (Klassisches Kontextmenü, Dateiendungen, Widgets, Telemetrie, Gaming & Explorer-Neustart).
8. **Netzwerk Toolkit** (`v1.7.0`) – Latenz- & Ping-Monitor, DNS-Benchmark, nativer TCP-Port-Scanner, Adapter-Übersicht & Flush DNS.
9. **Advanced Tools** (`v1.8.0`) – Windows-Tools Launcher (17 Verwaltungstools, God Mode), Autostart-Manager & Hosts-Datei Editor.
10. **Settings** (`v1.9.0`) – App-Konfiguration, Fluent Theme (Dark/Light/System), 5 Akzentfarben, Windows-Autostart, Live GitHub Update-Prüfung, AppData-Verwaltung und System-Info.

---

## 🛠️ Entwicklung & Mitarbeit von Agenten

Für alle Entwickler und KI-Agenten, die am Projekt mitarbeiten, existiert eine verbindliche Richtlinie:

👉 **[AGENT_GUIDE.md](./AGENT_GUIDE.md)**

Dort sind alle kritischen System-Gotchas (z. B. subst-Laufwerk `A:\`, Node.js Pfade, Tabuzonen und Versionsrichtlinien) genau dokumentiert.

---

## 💻 Schnellstart (Entwicklung)

```powershell
# In PowerShell:
npm run dev

# Bauen & TypeScript-Check:
npm run typecheck
npm run build:renderer
```

