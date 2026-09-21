# M-Toolbox — Befehle & Cheat Sheet

Eine Übersicht der wichtigsten Befehle für Entwicklung, lokale Builds und GitHub-Releases.

---

## 1. Entwicklung (Dev-Modus)

| Befehl | Beschreibung |
|---|---|
| `npm run dev` | Startet die App im Live-Entwicklungsmodus mit Hot-Reload |
| `.\dev.cmd` | Startskript per Doppelklick / Konsole (setzt Pfade automatisch) |

---

## 2. Lokaler Build & Tests

| Befehl | Beschreibung |
|---|---|
| `npm run typecheck` | Prüft alle TypeScript-Dateien auf Fehler |
| `npm run build:renderer` | Kompiliert das React-Frontend mit Vite |
| `.\build.cmd` | **1-Klick-Build:** Erzeugt die fertige `M-Toolbox.exe` lokal in `release\win-unpacked\` |

---

## 3. Neue Version auf GitHub hochladen (Automatische EXE erstellen)

Führen Sie diese Befehle in der PowerShell im Projektordner aus, wenn Sie eine neue Version veröffentlichen wollen (z. B. `1.9.1`):

### Schritt 1: Version in `package.json` anpassen
```powershell
npm version 1.9.1 --no-git-tag-version
```

### Schritt 2: Änderungen zu Git hinzufügen und committen
```powershell
git add .
git commit -m "Release v1.9.1: Fixes and improvements"
```

### Schritt 3: Versions-Tag setzen
```powershell
git tag v1.9.1
```

### Schritt 4: Zu GitHub hochladen
```powershell
git push origin main
git push origin v1.9.1
```

> **Was passiert danach?**
> - GitHub Actions startet automatisch den Windows-Build.
> - Unter **GitHub -> Releases** stehen nach ca. 2–3 Minuten bereit:
>   - `M-Toolbox-Setup-1.9.1.exe` (Installer)
>   - `M-Toolbox-1.9.1-portable.exe` (Portable Version)

---

## 4. Nützliche Git-Befehle

| Befehl | Beschreibung |
|---|---|
| `git status` | Zeigt geänderte und neue Dateien an |
| `git log --oneline -5` | Zeigt die letzten 5 Commits kompakt |
| `git tag` | Zeigt alle existierenden Versions-Tags |
| `git tag -d v1.9.1` | Löscht einen lokalen Tag (falls vertippt) |
| `git push origin --delete v1.9.1` | Löscht einen Tag auf GitHub |

