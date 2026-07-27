# calories – Kalorienzähler-PWA

Mobile-first Progressive Web App zum Tracken von Kalorien, Kohlenhydraten,
Eiweiß und Ballaststoffen über Mahlzeiten (Frühstück/Mittag/Abend/Snack) und
Nahrungsmittel, für mehrere Nutzer auf einem gemeinsamen Gerät.

## Features

- Tagesansicht mit Bullet-Graph (Kalorien/Kohlenhydrate/Eiweiß/Ballaststoffe vs.
  Tagesziel) und den vier Mahlzeit-Sektionen.
- Eintragen per Swipe-Geste: links = Frühstück, hoch = Mittag, rechts = Abend,
  runter = Snack.
- Liste aus Mahlzeiten und Zutaten, sortiert nach Nutzungshäufigkeit des
  aktiven Nutzers.
- Neue Zutaten per Kamera-Barcode-Scan (Open Food Facts) anlegen, Werte
  editierbar.
- Neue Mahlzeiten aus mehreren Zutaten mit Mengenangaben erstellen.
- Nutzer-Dropdown oben rechts (geräte-lokal, ohne Login), individuelle
  Tagesziele pro Nutzer.
- Installierbar als PWA (Manifest + Service Worker).

## Tech-Stack

- **Frontend**: React + TypeScript + Vite + MUI, `vite-plugin-pwa`,
  `html5-qrcode` (Barcode-Scan), Recharts (Bullet-Graph).
- **Backend**: Node.js + Express + `sql.js` (dateibasiertes SQLite).
- **Deployment**: Docker (Multi-Stage-Build), Docker Swarm Stack.

## Lokale Entwicklung

```bash
# Backend
cd backend
npm install
npm run dev            # http://localhost:3003, DB unter backend/data/calories.db, OFF_MODE=stub (Default)

# Frontend (separates Terminal)
cd frontend
npm install
npm run dev             # http://localhost:5173, proxied /api -> localhost:3003
```

Im Backend steuert die Env-Variable `OFF_MODE` den Open-Food-Facts-Zugriff:
- `stub` (Default): Barcode-Lookups werden aus `backend/src/off-stub-data.json`
  beantwortet – funktioniert komplett offline, ideal für lokale Entwicklung.
- `live`: echte Anfrage an `world.openfoodfacts.org`.

### Open Food Facts Zugang (authentifizierte Anfragen)

Über das Benutzer-Menü oben rechts → "Open Food Facts Zugang" kann der eigene
Open-Food-Facts-Benutzername und das Passwort hinterlegt werden. Beim
Speichern führt das Backend einen initialen Login gegen `/cgi/auth.pl` aus
(`POST https://world.openfoodfacts.org/cgi/auth.pl`) und speichert das
zurückgegebene Session-Cookie in der SQLite-Datenbank (Tabelle `off_config`).
Dieses Cookie wird zusammen mit einem festen `User-Agent`
(`Calories/0.0.1 (schubert.inf@gmail.com)`) sowie `app_name=Calories`,
`app_version=0.0.1` und einem einmalig generierten, gesalzenen `app_uuid` bei
allen weiteren Open-Food-Facts-Anfragen mitgeschickt. Passwort und Cookie
verlassen das Backend nie – die Konfigurationsseite bekommt nur Status
(verbunden/nicht verbunden, Benutzername) zurück. Ohne hinterlegte
Zugangsdaten funktionieren Barcode-Lookups weiterhin unauthentifiziert (Open
Food Facts erlaubt das für Lesezugriffe).

`DB_PATH` steuert den Speicherort der SQLite-Datei (Default:
`backend/data/calories.db`).

## Lokal per Docker starten (ohne NAS, ohne Internet)

```bash
docker compose -f docker-compose.local.yml up --build
```

Läuft komplett lokal: SQLite in einem lokalen Docker-Volume, `OFF_MODE=stub`,
erreichbar unter `http://localhost:3003`.

## Deployment (Docker Swarm auf Raspberry Pi + Synology NAS)

Voraussetzungen (analog zu `../mealplaner` und `../taster`): NFS-Share der
Synology NAS ist auf dem Pi unter `/volume1/cloudstorage` gemountet.

### Erstinstallation

```bash
./setup.sh
```

Das Skript ist idempotent (Pakete/Swarm/NFS-Mount/Datenverzeichnis/Image/Stack)
und kann beliebig oft ausgeführt werden. Optional: `./setup.sh --wipe-db` löscht
die SQLite-Datenbank auf der NAS (mit Sicherheitsabfrage).

### Nach Code-Änderungen

```bash
./redeploy.sh
```

Baut das Image neu und aktualisiert den laufenden Service im Swarm.

Beide Skripte können manuell durch dieselben Schritte ersetzt werden:

```bash
# einmalig auf dem Swarm-Manager:
sudo mkdir -p /volume1/cloudstorage/docker-swarm-data/calories
sudo chmod 777 /volume1/cloudstorage/docker-swarm-data/calories

# Image bauen und deployen:
docker build --platform linux/arm64 -t calories:latest .
docker stack deploy -c docker-compose.yml calories
```

Erreichbar unter `http://pi1:3003`. Die SQLite-Datenbank liegt persistent auf
der NAS unter `/volume1/cloudstorage/docker-swarm-data/calories`.

## Projektstruktur

```
backend/    Express-API + sql.js-Datenbank (persons, foods, meals, log_entries)
frontend/   React/Vite-PWA (Tagesansicht, Add-Sheet, Barcode-Scan, ...)
Dockerfile               Multi-Stage-Build (Frontend + Backend)
docker-compose.yml        Produktions-Stack (NAS-Bind-Mount, OFF_MODE=live)
docker-compose.local.yml  Lokaler Stack (lokales Volume, OFF_MODE=stub)
setup.sh                   Erstkonfiguration & Deployment auf dem Pi (idempotent)
redeploy.sh                Image neu bauen & Stack nach Code-Änderungen aktualisieren
```
