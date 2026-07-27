#!/usr/bin/env bash
# redeploy.sh — Image neu bauen und Stack deployen (idempotent: funktioniert auch beim ersten Mal)
# Auf dem Swarm-Manager-Pi aus dem Projektverzeichnis ausführen.
set -euo pipefail

STACK="calories"
IMAGE="calories:latest"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# ── 1. Image bauen (ARM64 für Raspberry Pi) ───────────────────────────────────
echo "==> Baue ${IMAGE} …"
docker build --platform linux/arm64 -t "${IMAGE}" "${SCRIPT_DIR}"

# ── 2. Stack deployen ─────────────────────────────────────────────────────────
echo "==> Deploye Stack '${STACK}' …"
OFF_MODE="${OFF_MODE:-live}" \
docker stack deploy -c "${SCRIPT_DIR}/docker-compose.yml" "${STACK}"

# ── 3. App-Service auf neues Image aktualisieren ──────────────────────────────
# docker stack deploy mit :latest-Tag startet laufende Services NICHT neu.
# --image erzwingt die Nutzung des gerade gebauten Images. Da sich der Tag-String
# ("calories:latest") nie ändert, hält Swarm den Service-Spec sonst für
# unverändert und startet den laufenden Task NICHT neu — --force erzwingt den
# Neustart, damit das frisch gebaute Image auch wirklich verwendet wird.
echo "==> Aktualisiere App-Service auf neues Image …"
docker service update --force --image "${IMAGE}" "${STACK}_app"

echo ""
echo "✓ Deployment abgeschlossen. Erreichbar unter: http://pi1:3003"
echo ""
docker stack ps "${STACK}" --no-trunc
