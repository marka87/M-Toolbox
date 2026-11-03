# M-Toolbox

Projektregeln, Architektur und Tabus stehen in [AGENT_GUIDE.md](AGENT_GUIDE.md). Lies es vor größeren Änderungen.

## Versionierung (immer selbst machen, nicht nachfragen)

- Jeder Commit mit Code-Änderungen erhöht die Version im selben Commit: `npm version X.Y.Z --no-git-tag-version`.
- SemVer: Fehlerbehebung/Detail = PATCH, neues Hauptmodul = MINOR, großer Umbau = MAJOR. Reine Doku-/CI-Commits: keine neue Version.
- Dazu einen Eintrag in `CHANGELOG.md` (deutsch, Keep a Changelog).
- Kein Git-Tag `v*` ohne ausdrückliche Anweisung: ein Tag startet den GitHub-Release.
- Direkt auf `main` committen und pushen, keine Feature-Branches.
