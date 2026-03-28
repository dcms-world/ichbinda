#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

PORT="${PORT:-8787}"
WORKER_URL="${WORKER_URL:-http://127.0.0.1:${PORT}}"
DB_NAME="${DB_NAME:-dev-ibinda-db}"
TURNSTILE_TEST_TOKEN='XXXX.DUMMY.TOKEN.XXXX'

PERSON_API_KEY="${PERSON_API_KEY:-test-person-key}"
WATCHER_API_KEY="${WATCHER_API_KEY:-test-watcher-key}"
PERSON_DEVICE_ID="${PERSON_DEVICE_ID:-test-person-device}"
WATCHER_DEVICE_ID="${WATCHER_DEVICE_ID:-test-watcher-device}"
PERSON_KEY_HASH="186582d521edf14917d097fb50b4898ae384ac5d6c5732ab1c1579a179344ea0"
WATCHER_KEY_HASH="931132119d780e554aa848330588b9faa7e1759d0c454a2fe2c91c86b4ac18d5"
PERSON_ID="${PERSON_ID:-$(node -e "console.log(crypto.randomUUID())")}"
REGISTER_DEVICE_ID="smoke-register-$(node -e "console.log(crypto.randomUUID())")"

TMP_DIR="$(mktemp -d)"
export XDG_CONFIG_HOME="$TMP_DIR/xdg-config"
export HOME="$TMP_DIR/home"
mkdir -p "$XDG_CONFIG_HOME" "$HOME"

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
  npx wrangler d1 execute "$DB_NAME" --local "$@" >/dev/null
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

start_worker() {
  npx wrangler dev --local --port "$PORT" --ip 127.0.0.1 >"$TMP_DIR/worker.log" 2>&1 &
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
run_local_d1 --file=./schema.sql
run_local_d1 --command "
  INSERT INTO device_keys (device_id, key_hash, created_at, role)
  VALUES ('${PERSON_DEVICE_ID}', '${PERSON_KEY_HASH}', datetime('now'), 'person')
  ON CONFLICT(device_id) DO UPDATE SET
    key_hash = excluded.key_hash,
    created_at = excluded.created_at,
    role = excluded.role;

  INSERT INTO device_keys (device_id, key_hash, created_at, role)
  VALUES ('${WATCHER_DEVICE_ID}', '${WATCHER_KEY_HASH}', datetime('now'), 'watcher')
  ON CONFLICT(device_id) DO UPDATE SET
    key_hash = excluded.key_hash,
    created_at = excluded.created_at,
    role = excluded.role;
"

start_worker

BODY_FILE="$TMP_DIR/response.json"

status="$(request GET "$WORKER_URL/" "" "$BODY_FILE")"
expect_status "GET /" "200" "$status" "$BODY_FILE"

status="$(request GET "$WORKER_URL/person.html" "" "$BODY_FILE")"
expect_status "GET /person.html" "200" "$status" "$BODY_FILE"

status="$(request GET "$WORKER_URL/watcher.html" "" "$BODY_FILE")"
expect_status "GET /watcher.html" "200" "$status" "$BODY_FILE"

status="$(request POST "$WORKER_URL/api/person" '{}' "$BODY_FILE" -H 'Content-Type: application/json')"
expect_status "POST /api/person ohne Auth" "401" "$status" "$BODY_FILE"

status="$(request POST "$WORKER_URL/api/person" '{"id":"not-a-uuid"}' "$BODY_FILE" -H 'Content-Type: application/json' -H "Authorization: Bearer ${PERSON_API_KEY}")"
expect_status "POST /api/person mit ungueltiger id" "400" "$status" "$BODY_FILE"
expect_body_contains "POST /api/person mit ungueltiger id" "$BODY_FILE" '"error":"Ungültige person_id"'

status="$(request POST "$WORKER_URL/api/auth/register-device" "{\"device_id\":\"${REGISTER_DEVICE_ID}\",\"turnstile_token\":\"${TURNSTILE_TEST_TOKEN}\",\"role\":\"person\"}" "$BODY_FILE" -H 'Content-Type: application/json')"
expect_status "POST /api/auth/register-device lokal mit Test-Token" "201" "$status" "$BODY_FILE"

status="$(request POST "$WORKER_URL/api/person" "{\"id\":\"${PERSON_ID}\"}" "$BODY_FILE" -H 'Content-Type: application/json' -H "Authorization: Bearer ${PERSON_API_KEY}")"
expect_status "POST /api/person mit Person-Key" "201" "$status" "$BODY_FILE"
expect_body_contains "POST /api/person" "$BODY_FILE" "$PERSON_ID"

status="$(request POST "$WORKER_URL/api/watcher" '{"push_token":"ExponentPushToken[test-smoke]","device_model":"iPhone"}' "$BODY_FILE" -H 'Content-Type: application/json' -H "Authorization: Bearer ${WATCHER_API_KEY}")"
expect_status "POST /api/watcher" "201" "$status" "$BODY_FILE"
WATCHER_ID="$(json_field "$BODY_FILE" id)"
log "Watcher-ID: $WATCHER_ID"

status="$(request POST "$WORKER_URL/api/heartbeat" "{\"person_id\":\"${PERSON_ID}\",\"status\":\"ok\"}" "$BODY_FILE" -H 'Content-Type: application/json' -H "Authorization: Bearer ${WATCHER_API_KEY}")"
expect_status "POST /api/heartbeat mit falscher Rolle" "403" "$status" "$BODY_FILE"

status="$(request POST "$WORKER_URL/api/watch" "{\"person_id\":\"${PERSON_ID}\",\"watcher_id\":\"${WATCHER_ID}\",\"check_interval_minutes\":60}" "$BODY_FILE" -H 'Content-Type: application/json' -H "Authorization: Bearer ${WATCHER_API_KEY}")"
expect_status "POST /api/watch" "200" "$status" "$BODY_FILE"

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

sleep 3
status="$(request POST "$WORKER_URL/api/heartbeat" "{\"person_id\":\"${PERSON_ID}\",\"status\":\"ok\"}" "$BODY_FILE" -H 'Content-Type: application/json' -H "Authorization: Bearer ${PERSON_API_KEY}")"
expect_status "Heartbeat 1" "200" "$status" "$BODY_FILE"

status="$(request POST "$WORKER_URL/api/heartbeat" "{\"person_id\":\"${PERSON_ID}\",\"status\":\"ok\"}" "$BODY_FILE" -H 'Content-Type: application/json' -H "Authorization: Bearer ${PERSON_API_KEY}")"
expect_status "Heartbeat 2 direkt danach" "429" "$status" "$BODY_FILE"
expect_body_contains "Heartbeat 2 direkt danach" "$BODY_FILE" '"error":"Too many requests"'

log "Smoke-Test erfolgreich abgeschlossen"
log "Hinweis: localhost nutzt automatisch die offiziellen Cloudflare-Turnstile-Testwerte."
