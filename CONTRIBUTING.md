# Contributing zu M-Toolbox

Danke für dein Interesse an M-Toolbox. Beiträge sollen stabil, nachvollziehbar und auf Windows 11 testbar sein.

## Entwicklungsumgebung

- Windows 11 x64
- Node.js LTS und npm
- Winget und PowerShell
- Git
- Visual Studio Code empfohlen

```powershell
npm ci
npm run typecheck
npm run dev
```

## Branching

- `main` enthält den stabilen Entwicklungsstand.
- Für Änderungen eigene Branches verwenden: `feature/<name>`, `fix/<name>` oder `docs/<name>`.
- Keine direkten Änderungen an `main` per Pull Request umgehen.

## Commits

Wir verwenden Conventional Commits, zum Beispiel:

- `feat: add driver export summary`
- `fix: handle missing winget output`
- `docs: update installation guide`
- `build: improve release workflow`

Betreffzeilen kurz und imperativ formulieren.

## Pull Requests

- Problem und Lösung beschreiben.
- Betroffene Module und Windows-Version nennen.
- Screenshots für UI-Änderungen beilegen.
- Typecheck und relevante Builds ausführen.
- Keine Zugangsdaten, lokalen Datenbanken oder Build-Artefakte committen.

## Code Style

- Bestehende TypeScript-, React- und Tailwind-Muster wiederverwenden.
- Kleine, fokussierte Änderungen bevorzugen.
- Kommentare nur für nicht offensichtliche Gründe.
- Benutzerfehler und Systemfehler verständlich behandeln.

## TypeScript

- `strict`-Modus beibehalten.
- Keine unnötigen `any`-Casts.
- Gemeinsame Typen in `src/shared/types.ts` pflegen.
- IPC-Kanäle in `src/shared/channels.ts` ergänzen.

## Tests und Validierung

Vor einem Pull Request mindestens:

```powershell
npm run typecheck
npm run build:renderer
```

Native Windows-Funktionen zusätzlich auf einer Testmaschine prüfen. Reparatur-, Registry- und Treiberaktionen nicht gegen produktive Daten testen.

## Versionierung

M-Toolbox folgt Semantic Versioning:

- Patch: Fehlerbehebungen und kleine Verbesserungen
- Minor: neue Module oder rückwärtskompatible Features
- Major: inkompatible Änderungen

Versionen werden in `package.json` und `package-lock.json` gepflegt. Releases verwenden Tags im Format `vX.Y.Z`.
