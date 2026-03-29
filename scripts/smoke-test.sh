#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

PORT="${PORT:-8787}"
WORKER_URL="${WORKER_URL:-http://127.0.0.1:${PORT}}"
DB_NAME="${DB_NAME:-dev-ibinda-db}"
TURNSTILE_TEST_SITE_KEY='1x00000000000000000000AA'
TURNSTILE_TEST_SECRET_KEY='1x0000000000000000000000000000000AA'
TURNSTILE_TEST_TOKEN='XXXX.DUMMY.TOKEN.XXXX'

PERSON_API_KEY="${PERSON_API_KEY:-test-person-key}"
WATCHER_API_KEY="${WATCHER_API_KEY:-test-watcher-key}"
PERSON_DEVICE_ID="${PERSON_DEVICE_ID:-test-person-device-$(node -e "console.log(crypto.randomUUID())")}"
WATCHER_DEVICE_ID="${WATCHER_DEVICE_ID:-test-watcher-device-$(node -e "console.log(crypto.randomUUID())")}"
PERSON_ID="${PERSON_ID:-$(node -e "console.log(crypto.randomUUID())")}"
REGISTER_DEVICE_ID="smoke-register-$(node -e "console.log(crypto.randomUUID())")"
EXPIRED_PAIRING_TOKEN="${EXPIRED_PAIRING_TOKEN:-$(node -e "console.log(crypto.randomUUID())")}"

TMP_DIR="$(mktemp -d)"
export XDG_CONFIG_HOME="$TMP_DIR/xdg-config"
export HOME="$TMP_DIR/home"
mkdir -p "$XDG_CONFIG_HOME" "$HOME"
WRANGLER_CONFIG="$TMP_DIR/wrangler.smoke.toml"
PERSIST_DIR="$TMP_DIR/persist"

write_wrangler_config() {
  cat >"$WRANGLER_CONFIG" <<EOF
name = "ibinda-smoke"
main = "$ROOT_DIR/src/index.ts"
compatibility_date = "2024-01-01"
account_id = "bcde28cac6ec64c3ed3a810c62971db5"

[[d1_databases]]
binding = "DB"
database_name = "$DB_NAME"
database_id = "c6136eb7-5dce-4c0c-b937-a47207b3f6ef"
migrations_dir = "$ROOT_DIR/migrations"

[vars]
TURNSTILE_SITE_KEY = "$TURNSTILE_TEST_SITE_KEY"
TURNSTILE_SECRET_KEY = "$TURNSTILE_TEST_SECRET_KEY"
DEV_TOKEN = "smoke-dev-token"
EOF
}

write_wrangler_config

WORKER_PID=""

cleanup() {
  if [[ -n "$WORKER_PID" ]]; then
    kill "$WORKER_PID" >/dev/null 2>&1 || true
    wait "$WORKER_PID" >/dev/null 2>&1 || true
  fi
  rm -rf "$TMP_DIR"
}

trap cleanup EXIT

log() {
  printf '%s\n' "$1"
}

fail() {
  printf 'FAIL: %s\n' "$1" >&2
  exit 1
}

run_local_d1() {
  npx wrangler --cwd "$TMP_DIR" -c "$WRANGLER_CONFIG" d1 execute "$DB_NAME" --local --persist-to "$PERSIST_DIR" "$@" >/dev/null
}

request() {
  local method="$1"
  local url="$2"
  local body="$3"
  local outfile="$4"
  shift 4

  if [[ -n "$body" ]]; then
    curl -sS -o "$outfile" -w '%{http_code}' -X "$method" "$url" "$@" --data "$body"
  else
    curl -sS -o "$outfile" -w '%{http_code}' -X "$method" "$url" "$@"
  fi
}

request_with_headers() {
  local method="$1"
  local url="$2"
  local body="$3"
  local body_file="$4"
  local headers_file="$5"
  shift 5

  if [[ -n "$body" ]]; then
    curl -sS -D "$headers_file" -o "$body_file" -w '%{http_code}' -X "$method" "$url" "$@" --data "$body"
  else
    curl -sS -D "$headers_file" -o "$body_file" -w '%{http_code}' -X "$method" "$url" "$@"
  fi
}

expect_status() {
  local label="$1"
  local expected="$2"
  local actual="$3"
  local body_file="$4"

  if [[ "$actual" != "$expected" ]]; then
    printf 'FAIL: %s expected %s, got %s\n' "$label" "$expected" "$actual" >&2
    printf 'Body:\n' >&2
    cat "$body_file" >&2
    exit 1
  fi

  printf 'PASS: %s (%s)\n' "$label" "$actual"
}

expect_body_contains() {
  local label="$1"
  local body_file="$2"
  local expected="$3"

  if ! grep -Fq "$expected" "$body_file"; then
    printf 'FAIL: %s body does not contain %s\n' "$label" "$expected" >&2
    printf 'Body:\n' >&2
    cat "$body_file" >&2
    exit 1
  fi

  printf 'PASS: %s contains %s\n' "$label" "$expected"
}

expect_headers_contains() {
  local label="$1"
  local headers_file="$2"
  local expected="$3"

  if ! grep -Fiq "$expected" "$headers_file"; then
    printf 'FAIL: %s headers do not contain %s\n' "$label" "$expected" >&2
    printf 'Headers:\n' >&2
    cat "$headers_file" >&2
    exit 1
  fi

  printf 'PASS: %s headers contain %s\n' "$label" "$expected"
}

json_field() {
  local body_file="$1"
  local field="$2"

  node -e '
    let input = "";
    process.stdin.on("data", chunk => input += chunk);
    process.stdin.on("end", () => {
      const value = JSON.parse(input)[process.argv[1]];
      if (value === undefined || value === null) {
        process.exit(1);
      }
      process.stdout.write(String(value));
    });
  ' "$field" <"$body_file"
}

cookie_value_from_headers() {
  local headers_file="$1"
  local cookie_name="$2"

  node -e '
    const fs = require("fs");
    const headers = fs.readFileSync(process.argv[1], "utf8");
    const cookieName = process.argv[2];
    const line = headers.split(/\r?\n/).find((entry) => entry.toLowerCase().startsWith("set-cookie:"));
    if (!line) process.exit(1);
    const cookiePart = line.slice(line.indexOf(":") + 1).trim().split(";")[0];
    const eqIndex = cookiePart.indexOf("=");
    if (eqIndex === -1) process.exit(1);
    const name = cookiePart.slice(0, eqIndex);
    const value = cookiePart.slice(eqIndex + 1);
    if (name !== cookieName || !value) process.exit(1);
    process.stdout.write(value);
  ' "$headers_file" "$cookie_name"
}

start_worker() {
  npx wrangler --cwd "$TMP_DIR" -c "$WRANGLER_CONFIG" dev --local --port "$PORT" --ip 127.0.0.1 --persist-to "$PERSIST_DIR" >"$TMP_DIR/worker.log" 2>&1 &
  WORKER_PID="$!"

  for _ in $(seq 1 40); do
    if curl -sS "$WORKER_URL/" >/dev/null 2>&1; then
      log "Worker ready on $WORKER_URL"
      return
    fi

    if ! kill -0 "$WORKER_PID" >/dev/null 2>&1; then
      cat "$TMP_DIR/worker.log" >&2 || true
      fail "Worker konnte nicht gestartet werden"
    fi

    sleep 0.5
  done

  cat "$TMP_DIR/worker.log" >&2 || true
  fail "Worker wurde nicht rechtzeitig bereit"
}

log "Bereite lokale D1 vor"
run_local_d1 --file="$ROOT_DIR/schema.sql"
run_local_d1 --command="INSERT OR IGNORE INTO persons (id) VALUES ('${PERSON_ID}'); INSERT INTO pairing_requests (pairing_token, person_id, status, created_at) VALUES ('${EXPIRED_PAIRING_TOKEN}', '${PERSON_ID}', 'pending', datetime('now', '-6 minutes'));"

start_worker

BODY_FILE="$TMP_DIR/response.json"
HEADERS_FILE="$TMP_DIR/headers.txt"

status="$(request GET "$WORKER_URL/" "" "$BODY_FILE")"
expect_status "GET /" "200" "$status" "$BODY_FILE"

status="$(request GET "$WORKER_URL/person.html" "" "$BODY_FILE")"
expect_status "GET /person.html" "200" "$status" "$BODY_FILE"

status="$(request GET "$WORKER_URL/watcher.html" "" "$BODY_FILE")"
expect_status "GET /watcher.html" "200" "$status" "$BODY_FILE"

status="$(request POST "$WORKER_URL/api/person" '{}' "$BODY_FILE" -H 'Content-Type: application/json')"
expect_status "POST /api/person ohne Auth" "401" "$status" "$BODY_FILE"

status="$(request_with_headers POST "$WORKER_URL/api/auth/register-device" "{\"device_id\":\"${PERSON_DEVICE_ID}\",\"turnstile_token\":\"${TURNSTILE_TEST_TOKEN}\",\"role\":\"person\"}" "$BODY_FILE" "$HEADERS_FILE" -H 'Content-Type: application/json')"
expect_status "POST /api/auth/register-device lokal mit Test-Token" "201" "$status" "$BODY_FILE"
PERSON_API_KEY="$(cookie_value_from_headers "$HEADERS_FILE" "api_key_person")"

status="$(request POST "$WORKER_URL/api/auth/register-device" "{\"device_id\":\"${PERSON_DEVICE_ID}\",\"turnstile_token\":\"${TURNSTILE_TEST_TOKEN}\",\"role\":\"person\"}" "$BODY_FILE" -H 'Content-Type: application/json')"
expect_status "POST /api/auth/register-device Konfliktfall" "409" "$status" "$BODY_FILE"
expect_body_contains "POST /api/auth/register-device Konfliktfall" "$BODY_FILE" '"error":"device_id bereits registriert"'

status="$(request_with_headers POST "$WORKER_URL/api/auth/register-device" "{\"device_id\":\"${WATCHER_DEVICE_ID}\",\"turnstile_token\":\"${TURNSTILE_TEST_TOKEN}\",\"role\":\"watcher\"}" "$BODY_FILE" "$HEADERS_FILE" -H 'Content-Type: application/json')"
expect_status "POST /api/auth/register-device fuer Watcher" "201" "$status" "$BODY_FILE"
WATCHER_API_KEY="$(cookie_value_from_headers "$HEADERS_FILE" "api_key_watcher")"

status="$(request POST "$WORKER_URL/api/person" '{"id":"not-a-uuid"}' "$BODY_FILE" -H 'Content-Type: application/json' -H "Authorization: Bearer ${PERSON_API_KEY}")"
expect_status "POST /api/person mit ungueltiger id" "400" "$status" "$BODY_FILE"
expect_body_contains "POST /api/person mit ungueltiger id" "$BODY_FILE" '"error":"Ungültige person_id"'

status="$(request_with_headers OPTIONS "$WORKER_URL/api/auth/register-device" "" "$BODY_FILE" "$HEADERS_FILE" -H 'Origin: http://127.0.0.1:8787' -H 'Access-Control-Request-Method: POST')"
expect_status "OPTIONS /api/auth/register-device mit lokalem Origin" "204" "$status" "$BODY_FILE"
expect_headers_contains "OPTIONS /api/auth/register-device mit lokalem Origin" "$HEADERS_FILE" 'Access-Control-Allow-Origin: http://127.0.0.1:8787'

status="$(request_with_headers OPTIONS "$WORKER_URL/api/auth/register-device" "" "$BODY_FILE" "$HEADERS_FILE" -H 'Origin: capacitor://localhost' -H 'Access-Control-Request-Method: POST')"
expect_status "OPTIONS /api/auth/register-device mit Capacitor-Origin" "204" "$status" "$BODY_FILE"
expect_headers_contains "OPTIONS /api/auth/register-device mit Capacitor-Origin" "$HEADERS_FILE" 'Access-Control-Allow-Origin: capacitor://localhost'

status="$(request POST "$WORKER_URL/api/auth/register-device" "{\"device_id\":\"smoke-blocked-origin\",\"turnstile_token\":\"${TURNSTILE_TEST_TOKEN}\",\"role\":\"person\"}" "$BODY_FILE" -H 'Content-Type: application/json' -H 'Origin: https://evil.example')"
expect_status "POST /api/auth/register-device mit fremdem Origin" "403" "$status" "$BODY_FILE"
expect_body_contains "POST /api/auth/register-device mit fremdem Origin" "$BODY_FILE" '"error":"Origin not allowed"'

status="$(request POST "$WORKER_URL/api/person" "{\"id\":\"${PERSON_ID}\"}" "$BODY_FILE" -H 'Content-Type: application/json' -H "Authorization: Bearer ${PERSON_API_KEY}")"
expect_status "POST /api/person mit Person-Key" "201" "$status" "$BODY_FILE"
expect_body_contains "POST /api/person" "$BODY_FILE" "$PERSON_ID"

status="$(request POST "$WORKER_URL/api/watcher" '{"push_token":"ExponentPushToken[test-smoke]","device_model":"iPhone"}' "$BODY_FILE" -H 'Content-Type: application/json' -H "Authorization: Bearer ${WATCHER_API_KEY}")"
expect_status "POST /api/watcher" "201" "$status" "$BODY_FILE"
WATCHER_ID="$(json_field "$BODY_FILE" id)"
log "Watcher-ID: $WATCHER_ID"

status="$(request POST "$WORKER_URL/api/pair/respond" "{\"pairing_token\":\"${EXPIRED_PAIRING_TOKEN}\",\"watcher_name\":\"Max Muster\"}" "$BODY_FILE" -H 'Content-Type: application/json' -H "Authorization: Bearer ${WATCHER_API_KEY}")"
expect_status "POST /api/pair/respond mit abgelaufenem Token" "410" "$status" "$BODY_FILE"
expect_body_contains "POST /api/pair/respond mit abgelaufenem Token" "$BODY_FILE" '"error":"Pairing abgelaufen"'

status="$(request POST "$WORKER_URL/api/heartbeat" "{\"person_id\":\"${PERSON_ID}\",\"status\":\"ok\"}" "$BODY_FILE" -H 'Content-Type: application/json' -H "Authorization: Bearer ${WATCHER_API_KEY}")"
expect_status "POST /api/heartbeat mit falscher Rolle" "403" "$status" "$BODY_FILE"

status="$(request POST "$WORKER_URL/api/pair/create" "{\"person_id\":\"${PERSON_ID}\"}" "$BODY_FILE" -H 'Content-Type: application/json' -H "Authorization: Bearer ${PERSON_API_KEY}")"
expect_status "POST /api/pair/create" "201" "$status" "$BODY_FILE"
PAIRING_TOKEN="$(json_field "$BODY_FILE" pairing_token)"
log "Pairing-Token: $PAIRING_TOKEN"

status="$(request GET "$WORKER_URL/api/pair/${PAIRING_TOKEN}" "" "$BODY_FILE" -H "Authorization: Bearer ${PERSON_API_KEY}")"
expect_status "GET /api/pair/:token vor Antwort" "200" "$status" "$BODY_FILE"
expect_body_contains "GET /api/pair/:token vor Antwort" "$BODY_FILE" '"status":"pending"'

status="$(request GET "$WORKER_URL/api/pair/not-a-uuid" "" "$BODY_FILE" -H "Authorization: Bearer ${PERSON_API_KEY}")"
expect_status "GET /api/pair/:token mit ungueltigem Token" "400" "$status" "$BODY_FILE"
expect_body_contains "GET /api/pair/:token mit ungueltigem Token" "$BODY_FILE" '"error":"Ungültiger pairing_token"'

status="$(request GET "$WORKER_URL/api/pair/${PAIRING_TOKEN}" "" "$BODY_FILE" -H "Authorization: Bearer ${WATCHER_API_KEY}")"
expect_status "GET /api/pair/:token ohne Berechtigung" "403" "$status" "$BODY_FILE"
expect_body_contains "GET /api/pair/:token ohne Berechtigung" "$BODY_FILE" '"error":"Forbidden"'

status="$(request POST "$WORKER_URL/api/watch" "{\"person_id\":\"${PERSON_ID}\",\"watcher_id\":\"${WATCHER_ID}\",\"check_interval_minutes\":60}" "$BODY_FILE" -H 'Content-Type: application/json' -H "Authorization: Bearer ${WATCHER_API_KEY}")"
expect_status "POST /api/watch deaktiviert" "410" "$status" "$BODY_FILE"
expect_body_contains "POST /api/watch deaktiviert" "$BODY_FILE" 'Pairing-QR-Code'

status="$(request POST "$WORKER_URL/api/pair/respond" "{\"pairing_token\":\"${PAIRING_TOKEN}\",\"watcher_name\":\"Max Muster\"}" "$BODY_FILE" -H 'Content-Type: application/json' -H "Authorization: Bearer ${WATCHER_API_KEY}")"
expect_status "POST /api/pair/respond" "200" "$status" "$BODY_FILE"
expect_body_contains "POST /api/pair/respond" "$BODY_FILE" '"status":"requested"'

status="$(request GET "$WORKER_URL/api/pair/${PAIRING_TOKEN}" "" "$BODY_FILE" -H "Authorization: Bearer ${PERSON_API_KEY}")"
expect_status "GET /api/pair/:token nach Anfrage" "200" "$status" "$BODY_FILE"
expect_body_contains "GET /api/pair/:token nach Anfrage" "$BODY_FILE" '"status":"requested"'
expect_body_contains "GET /api/pair/:token nach Anfrage" "$BODY_FILE" '"watcher_name":"Max Muster"'

status="$(request POST "$WORKER_URL/api/pair/confirm" "{\"pairing_token\":\"${PAIRING_TOKEN}\",\"action\":\"approve\"}" "$BODY_FILE" -H 'Content-Type: application/json' -H "Authorization: Bearer ${PERSON_API_KEY}")"
expect_status "POST /api/pair/confirm approve" "200" "$status" "$BODY_FILE"
expect_body_contains "POST /api/pair/confirm approve" "$BODY_FILE" '"status":"completed"'

status="$(request GET "$WORKER_URL/api/pair/${PAIRING_TOKEN}" "" "$BODY_FILE" -H "Authorization: Bearer ${PERSON_API_KEY}")"
expect_status "GET /api/pair/:token nach Bestaetigung" "200" "$status" "$BODY_FILE"
expect_body_contains "GET /api/pair/:token nach Bestaetigung" "$BODY_FILE" '"status":"completed"'
expect_body_contains "GET /api/pair/:token nach Bestaetigung" "$BODY_FILE" '"watcher_name":"Max Muster"'

status="$(request POST "$WORKER_URL/api/heartbeat" "{\"person_id\":\"${PERSON_ID}\",\"status\":\"ok\"}" "$BODY_FILE" -H 'Content-Type: application/json' -H "Authorization: Bearer ${PERSON_API_KEY}")"
expect_status "POST /api/heartbeat mit Person-Key" "200" "$status" "$BODY_FILE"

status="$(request GET "$WORKER_URL/api/watcher/${WATCHER_ID}/persons" "" "$BODY_FILE" -H "Authorization: Bearer ${WATCHER_API_KEY}")"
expect_status "GET /api/watcher/:id/persons" "200" "$status" "$BODY_FILE"
expect_body_contains "GET /api/watcher/:id/persons" "$BODY_FILE" "$PERSON_ID"

status="$(request GET "$WORKER_URL/api/person/${PERSON_ID}/has-watcher" "" "$BODY_FILE" -H "Authorization: Bearer ${PERSON_API_KEY}")"
expect_status "GET /api/person/:id/has-watcher" "200" "$status" "$BODY_FILE"
expect_body_contains "GET /api/person/:id/has-watcher" "$BODY_FILE" '"has_watcher":true'

LONG_NAME="$(printf 'A%.0s' $(seq 1 36))"
status="$(request POST "$WORKER_URL/api/watcher/${WATCHER_ID}/announce" "{\"name\":\"${LONG_NAME}\"}" "$BODY_FILE" -H 'Content-Type: application/json' -H "Authorization: Bearer ${WATCHER_API_KEY}")"
expect_status "POST /api/watcher/:id/announce mit zu langem Namen" "400" "$status" "$BODY_FILE"
expect_body_contains "POST /api/watcher/:id/announce mit zu langem Namen" "$BODY_FILE" '"error":"name too long"'

status="$(request POST "$WORKER_URL/api/watcher/${WATCHER_ID}/announce" '{"name":"A"}' "$BODY_FILE" -H 'Content-Type: application/json' -H "Authorization: Bearer ${WATCHER_API_KEY}")"
expect_status "POST /api/watcher/:id/announce mit zu kurzem Namen" "400" "$status" "$BODY_FILE"
expect_body_contains "POST /api/watcher/:id/announce mit zu kurzem Namen" "$BODY_FILE" '"error":"name too short"'

status="$(request POST "$WORKER_URL/api/watcher/${WATCHER_ID}/announce" '{"name":"1A Test"}' "$BODY_FILE" -H 'Content-Type: application/json' -H "Authorization: Bearer ${WATCHER_API_KEY}")"
expect_status "POST /api/watcher/:id/announce mit ungueltigem Start" "400" "$status" "$BODY_FILE"
expect_body_contains "POST /api/watcher/:id/announce mit ungueltigem Start" "$BODY_FILE" '"error":"name must start with 2 letters"'

status="$(request DELETE "$WORKER_URL/api/watch" "{\"person_id\":\"${PERSON_ID}\",\"watcher_id\":\"${WATCHER_ID}\"}" "$BODY_FILE" -H 'Content-Type: application/json' -H "Authorization: Bearer ${WATCHER_API_KEY}")"
expect_status "DELETE /api/watch" "200" "$status" "$BODY_FILE"
expect_body_contains "DELETE /api/watch" "$BODY_FILE" '"success":true'

status="$(request GET "$WORKER_URL/api/person/${PERSON_ID}/watchers" "" "$BODY_FILE" -H "Authorization: Bearer ${PERSON_API_KEY}")"
expect_status "GET /api/person/:id/watchers nach Trennung" "200" "$status" "$BODY_FILE"
expect_body_contains "GET /api/person/:id/watchers nach Trennung" "$BODY_FILE" '"watcher_count":0'
expect_body_contains "GET /api/person/:id/watchers nach Trennung" "$BODY_FILE" '"disconnect_events":[{"id":'
expect_body_contains "GET /api/person/:id/watchers nach Trennung" "$BODY_FILE" "\"watcher_name\":\"Max Muster\""

status="$(request POST "$WORKER_URL/api/person/${PERSON_ID}/disconnect-events/ack" '{"event_ids":[1]}' "$BODY_FILE" -H 'Content-Type: application/json' -H "Authorization: Bearer ${PERSON_API_KEY}")"
expect_status "POST /api/person/:id/disconnect-events/ack" "200" "$status" "$BODY_FILE"
expect_body_contains "POST /api/person/:id/disconnect-events/ack" "$BODY_FILE" '"acknowledged_count":1'

status="$(request GET "$WORKER_URL/api/person/${PERSON_ID}/watchers" "" "$BODY_FILE" -H "Authorization: Bearer ${PERSON_API_KEY}")"
expect_status "GET /api/person/:id/watchers nach Bestätigung" "200" "$status" "$BODY_FILE"
expect_body_contains "GET /api/person/:id/watchers nach Bestätigung" "$BODY_FILE" '"disconnect_events":[]'

status="$(request GET "$WORKER_URL/api/person/${PERSON_ID}/has-watcher" "" "$BODY_FILE" -H "Authorization: Bearer ${PERSON_API_KEY}")"
expect_status "GET /api/person/:id/has-watcher nach Trennung" "200" "$status" "$BODY_FILE"
expect_body_contains "GET /api/person/:id/has-watcher nach Trennung" "$BODY_FILE" '"has_watcher":false'

status="$(request POST "$WORKER_URL/api/person" '{}' "$BODY_FILE" -H 'Content-Type: application/json' -H "Authorization: Bearer ${PERSON_API_KEY}")"
expect_status "POST /api/person fuer Rate-Limit-Test" "201" "$status" "$BODY_FILE"
RATE_LIMIT_PERSON_ID="$(json_field "$BODY_FILE" id)"

status="$(request POST "$WORKER_URL/api/heartbeat" "{\"person_id\":\"${RATE_LIMIT_PERSON_ID}\",\"status\":\"ok\"}" "$BODY_FILE" -H 'Content-Type: application/json' -H "Authorization: Bearer ${PERSON_API_KEY}")"
expect_status "Heartbeat 1" "200" "$status" "$BODY_FILE"

status="$(request POST "$WORKER_URL/api/heartbeat" "{\"person_id\":\"${RATE_LIMIT_PERSON_ID}\",\"status\":\"ok\"}" "$BODY_FILE" -H 'Content-Type: application/json' -H "Authorization: Bearer ${PERSON_API_KEY}")"
expect_status "Heartbeat 2 direkt danach" "429" "$status" "$BODY_FILE"
expect_body_contains "Heartbeat 2 direkt danach" "$BODY_FILE" '"error":"Too many requests"'

log "Smoke-Test erfolgreich abgeschlossen"
log "Hinweis: localhost nutzt automatisch die offiziellen Cloudflare-Turnstile-Testwerte."
