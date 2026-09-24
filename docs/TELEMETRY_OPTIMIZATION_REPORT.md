# M-Toolbox — Telemetrie & Performance Optimierung (Zero-Drain)

**Branch:** `perf/telemetry-zero-drain`  
**Datum:** 24. September 2026  
**Ziel:** Minimierung von CPU-, Akku- und Prozesslast ohne Funktionsverlust.

---

## 1. Schritt 0 – Prüfungszusammenfassung (Audit)

1. **PowerShell-Prozesse:** Jedes `runPowerShell()` startete bisher einen neuen `powershell.exe`-Prozess (erheblicher CPU-/Akkudrain bei 1–3s Intervallen).
2. **Batterie-Cache:** `getStaticBatteryData()` cacht die Hardware-Daten (`designCapacity`, `fullChargeCapacity`), nutzt `powercfg` nur bei echtem Bedarf.
3. **Dashboard:** Nutzt im Live-Stream ausschließlich `cpu`, `ram` und `net` (Download/Upload).
4. **Mini-HUD Widget:** Nutzt ausschließlich `cpu`, `ram`, `gpu`, `battery` und `watts`.
5. **Temperatur-Telemetrie:** Wurde von keinem UI-Fenster aktiv im Live-Modus konsumiert.
6. **SMART-Status:** Wurde von keinem Fenster im Timer benötigt (nur bei manuellem Aufruf auf Anfrage).
7. **IPC-Push:** Pushte zuvor alle 500 ms ungefiltert an alle Fenster, selbst wenn diese minimiert oder im Tray versteckt waren.
8. **GPU-Sampling:** `nvidia-smi` und WMI liefen getrennt; `nvidia-smi` wurde für Temperatur und Auslastung getrennt aufgerufen.
9. **Netzwerk-Sampling:** Führte jede Sekunde `netstat -e` als eigenständigen Systemprozess aus.
10. **Desktop-Hardware:** Pollte bisher auch auf PCs ohne Akku periodisch WMI-Batterieklassen.

---

## 2. Durchgeführte Optimierungsphasen (P1 – P6)

### Phase P1 – Scheduler & Timer (Commit `59e08f7`)
- **Verkettetes setTimeout:** Ersetzung der starren `setInterval(500ms)`-Schleife durch einen adaptiven Scheduler, der zur jeweils nächsten fälligen Metrik schläft.
- **Re-Entrancy & Mutex:** Schutz vor überlappenden Durchläufen. `last*SampleTime` wird vor dem `await` gesetzt. Eigener `isSamplingNet`-Mutex für Netzwerk-Aufrufe.
- **Power & Session State:** Getrennte Erfassung von `isLocked` (Bildschirmsperre) und `isSuspended` (Energiesparmodus). Timer wird bei Sperre/Suspend/Pause via `clearTimeout` vollständig gestoppt.
- **Snapshot nach Aufwachen:** Genau ein frischer Snapshot wird nach dem Entsperren erzeugt; keine doppelten Timer.

### Phase P2 – Bedarfsgesteuerte Metriken & Fenster-Sichtbarkeit (Commit `b484f90`)
- **Selective Subscription:** `subscribe(listener, { metrics, windowId })` berechnet die Schnittmenge aktiver Metriken:
  - Dashboard: `['cpu', 'ram', 'net']`
  - Mini-HUD: `['cpu', 'ram', 'gpu', 'battery', 'watts']`
- **Sichtbarkeits-Tracking:** Automatische Erfassung von Fenster-Events (`minimize`, `hide`, `restore`, `show`). Versteckte oder im Tray befindliche Fenster zählen als inaktiv und pausieren ihren Telemetriebedarf.
- **Hintergrund-Modus:** Metriken ohne aktive Abonnenten (z. B. `temperatures`, `smartStatus`) schlafen komplett und laufen nicht im Timer.

### Phase P3 – Persistenter PowerShell-Worker (Commit `227a172`)
- **Langlebiger Prozess:** Einführung von `PowerShellWorkerService` (`powershell.exe` mit `-NoProfile -NoLogo -NonInteractive -WindowStyle Hidden`).
- **Base64 & Framing:** Befehlsübertragung per Base64-Strings über `stdin`, Antworten über `__MTOOLBOX_END__`-Begrenzer gerahmt.
- **Fehlertoleranz:** Serielle FIFO-Queue mit Timeout, 3-Strike-Backoff und automatischem Fallback auf `powershellService.runPowerShell`.
- **Zero-Idle-Drain:** Automatischer Shutdown des Workers nach 60 Sekunden Inaktivität.

### Phase P4 – Netzwerk-Sampling ohne `netstat.exe` (Commit `4386321`)
- **Direkte .NET-Abfrage:** `sampleNetwork()` nutzt `[System.Net.NetworkInformation.NetworkInterface]::GetAllNetworkInterfaces()` über den persistenten Worker.
- **Filterung:** Schließt Loopback und inaktive Adapter aus; summiert BytesReceived/BytesSent direkt aus den IP-Statistiken.
- **Fallback:** Bleibt auf `netstat -e` rückwärtskompatibel, falls der Worker ausfällt.

### Phase P5 – Batterie-Optimierung & Desktop-Erkennung (Commit `5b78ae0`)
- **Hardware-Caching:** `hasBatteryHardware` wird einmalig ermittelt. Desktop-PCs ohne Akku überspringen Batterie-Polls vollständig (statisch 100% / AC).
- **Adaptive Intervalle:** Batterie-Intervall auf 30s/60s gestreckt (nur wenn `watts` aktiv im Mini-HUD angefordert wird: 3s/6s).
- **Health-Checks:** Batterie-Gesundheitsprüfungen auf $\ge$ 1 Stunde gedrosselt.
- **Dirty-Checking:** Signaturprüfung schließt `healthPercent` ein, um unnötige IPC-Übertragungen zu verhindern.

### Phase P6 – GPU-Kombination & Robustheit (Commit `678577c`)
- **Kombinierte Abfrage:** `nvidia-smi --query-gpu=utilization.gpu,temperature.gpu` liest Auslastung und Temperatur in einem einzigen Prozessaufruf aus.
- **Robuster Backoff:** Bei Abstürzen oder Timeouts greift nach 3 Fehlern ein 5-minütiger Backoff, der unnötigen Prozess-Spam verhindert.
- **WMI-Fallback & Hybrid-GPU:** WMI-Fallback mit 2500 ms Timeout. Option `experimentalHybridGpuCounters` in Einstellungen (`SettingsPage.tsx`) integriert.
- **Diagnoseschalter:** `M_TOOLBOX_TELEMETRY_DEBUG=1` (10s Terminal-Logger) und `M_TOOLBOX_TELEMETRY_LEGACY=1` (500ms Fallback-Loop) integriert.

---

## 3. Vorher- / Nachher-Vergleich: Prozess-Starts (`process spawns`)

| Szenario | Vorher (v2.5.1) | Nachher (`perf/telemetry-zero-drain`) | Ersparnis |
|---|---|---|---|
| **App im Tray minimiert** (kein Fenster sichtbar) | **ca. 120–180 Prozesse / Minute**<br>*(Timer lief blind mit netstat, powershell.exe, nvidia-smi weiter)* | **0 Prozesse / Minute**<br>*(Timer schläft komplett, keine Prozess-Starts)* | **100 %** |
| **Nur Mini-HUD aktiv** | **ca. 90–120 Prozesse / Minute**<br>*(powershell.exe für WMI alle 3s, netstat alle 1s, nvidia-smi)* | **ca. 20–30 Aufrufe / Minute**<br>*(Netzwerk aus; 1 persistenter PS-Worker; nvidia-smi gebündelt)* | **~75–80 %** |
| **Dashboard im Vordergrund** | **ca. 140–180 Prozesse / Minute**<br>*(Jede Sekunde neue powershell.exe & netstat.exe)* | **0–1 neue Prozesse / Minute**<br>*(Node `os`-Modul für CPU/RAM; Netzwerk über persistenten PS-Worker)* | **> 95 %** |
| **Desktop-PC (ohne Akku)** | **ca. 20 WMI-Abfragen / Minute** nach Akku | **0 WMI-Abfragen**<br>*(Hardware-Erkennung deaktiviert Akku-Sampling)* | **100 %** |

---

## 4. Diagnose- und Testschalter

Zur Überprüfung des Verhaltens im laufenden Betrieb stehen Umgebungsvariablen zur Verfügung:

### 1. Telemetrie-Diagnose (Logs alle 10 Sekunden)
```powershell
$env:M_TOOLBOX_TELEMETRY_DEBUG = "1"
npm run dev
```
*Gibt alle 10 Sekunden die aktuell aktiven Metriken, den Status des PowerShell-Workers und die Anzahl der Prozess-Starts im Terminal aus.*

### 2. Legacy-Fallback-Schleife (zum A/B-Vergleich)
```powershell
$env:M_TOOLBOX_TELEMETRY_LEGACY = "1"
npm run dev
```
*Aktiviert das alte `setInterval(500ms)`-Verhalten ohne adaptive Schlaffunktion.*
