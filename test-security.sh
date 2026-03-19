#!/usr/bin/env bash
# Test-Skript für SicherDa API mit API-Key Auth

set -euo pipefail

WORKER_URL="${WORKER_URL:-http://127.0.0.1:8787}"
API_KEY="${API_KEY:-your-api-key-here}"
PERSON_ID="${PERSON_ID:-test-person-123}"

echo "=== SicherDa API Security Tests ==="
echo "URL: $WORKER_URL"
echo ""

echo "1. Health Check (kein Auth nötig)"
curl -s "${WORKER_URL}/api/person/test" | head -c 200 || echo "OK"
echo ""
echo ""

echo "2. Heartbeat OHNE API-Key (erwartet: 401 Unauthorized)"
curl -s -X POST "${WORKER_URL}/api/heartbeat" \
  -H "Content-Type: application/json" \
  --data "{\"person_id\":\"${PERSON_ID}\"}"
echo ""
echo ""

echo "3. Heartbeat MIT API-Key (erwartet: 200 OK)"
curl -s -X POST "${WORKER_URL}/api/heartbeat" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: ${API_KEY}" \
  --data "{\"person_id\":\"${PERSON_ID}\",\"status\":\"ok\"}"
echo ""
echo ""

echo "4. Heartbeat WIEDERHOLT (erwartet: 429 Too Many Requests - 5 Minuten Rate Limit)"
curl -s -X POST "${WORKER_URL}/api/heartbeat" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: ${API_KEY}" \
  --data "{\"person_id\":\"${PERSON_ID}\",\"status\":\"ok\"}"
echo ""
echo ""

echo "5. Heartbeat mit FALSCHEN API-Key (erwartet: 401 Unauthorized)"
curl -s -X POST "${WORKER_URL}/api/heartbeat" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: wrong-key-123" \
  --data "{\"person_id\":\"${PERSON_ID}\",\"status\":\"ok\"}"
echo ""
echo ""

echo "=== Tests abgeschlossen ==="
echo ""
echo "Hinweise:"
echo "- Setze API_KEY Umgebungsvariable: export API_KEY=dein-echter-key"
echo "- Rate Limit: 1 Request pro 5 Minuten pro Person"
echo "- Bei 429: Retry-After Header zeigt verbleibende Sekunden"
