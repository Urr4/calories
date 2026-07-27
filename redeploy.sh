#!/usr/bin/env bash
# redeploy.sh — Image neu bauen und Stack deployen (idempotent: funktioniert auch beim ersten Mal)
# Auf dem Swarm-Manager-Pi aus dem Projektverzeichnis ausführen.
set -euo pipefail

STACK="calories"
IMAGE="calories:latest"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

DATA_ROOT="/volume1/cloudstorage/docker-swarm-data"
TLS_HOSTNAME="${TLS_HOSTNAME:-pi1}"

# ── 0. TLS-Zertifikat sicherstellen (für Kamera-Zugriff per HTTPS) ───────────
# redeploy.sh wird auch für spätere Updates genutzt (nicht nur setup.sh beim
# Erstdeployment) — daher muss auch hier sichergestellt sein, dass das
# selbstsignierte Zertifikat existiert, sonst startet das Backend keinen
# HTTPS-Listener und https://pi1:3443 antwortet nicht mit TLS.
ensure_tls_cert() {
  local tls_dir="${DATA_ROOT}/calories/tls"
  local cert="${tls_dir}/cert.pem"
  local key="${tls_dir}/key.pem"

  sudo mkdir -p "${tls_dir}"
  # Verzeichnis muss (wie das Datenverzeichnis) für alle lesbar/durchsuchbar
  # sein, da Synologys root_squash den root-Nutzer im Container auf einen
  # rechtelosen anonymen Nutzer abbildet - sonst schlägt der Zugriff auf das
  # Zertifikat bei künftigen Container-Neustarts sporadisch fehl.
  sudo chmod 777 "${tls_dir}"

  if [[ -f "${cert}" && -f "${key}" ]]; then
    sudo chmod 644 "${cert}" "${key}"
    echo "==> TLS-Zertifikat vorhanden (${cert})."
    return
  fi

  echo "==> Kein TLS-Zertifikat gefunden — generiere eines für '${TLS_HOSTNAME}'..."

  local lan_ip
  lan_ip="$(hostname -I 2>/dev/null | awk '{print $1}')"
  local san="DNS:${TLS_HOSTNAME},DNS:localhost,IP:127.0.0.1"
  [[ -n "${lan_ip}" ]] && san="${san},IP:${lan_ip}"

  sudo openssl req -x509 -newkey rsa:2048 -sha256 -days 3650 -nodes \
    -keyout "${key}" -out "${cert}" \
    -subj "/CN=${TLS_HOSTNAME}" \
    -addext "subjectAltName=${san}" \
    >/dev/null 2>&1
  sudo chmod 644 "${cert}" "${key}"

  echo "==> TLS-Zertifikat erstellt: ${cert}"
}
ensure_tls_cert

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
echo "✓ Deployment abgeschlossen. Erreichbar unter: http://pi1:3003 (https://pi1:3443 für Kamera-Zugriff)"
echo ""
docker stack ps "${STACK}" --no-trunc
