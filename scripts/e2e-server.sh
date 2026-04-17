#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

PORT="${PORT:-4173}"
DB_NAME="${DB_NAME:-dev-ibinda-db}"
TURNSTILE_TEST_SITE_KEY='1x00000000000000000000AA'
TURNSTILE_TEST_SECRET_KEY='1x0000000000000000000000000000000AA'

TMP_DIR="$(mktemp -d)"
export XDG_CONFIG_HOME="$TMP_DIR/xdg-config"
export HOME="$TMP_DIR/home"
mkdir -p "$XDG_CONFIG_HOME" "$HOME"

WRANGLER_CONFIG="$TMP_DIR/wrangler.e2e.toml"
PERSIST_DIR="$TMP_DIR/persist"

cleanup() {
  rm -rf "$TMP_DIR"
}

trap cleanup EXIT

cat >"$WRANGLER_CONFIG" <<EOF
name = "ibinda-e2e"
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
DEV_TOKEN = "e2e-dev-token"
EOF

npx wrangler --cwd "$TMP_DIR" -c "$WRANGLER_CONFIG" d1 execute "$DB_NAME" --local --persist-to "$PERSIST_DIR" --file="$ROOT_DIR/schema.sql" >/dev/null
npx wrangler --cwd "$TMP_DIR" -c "$WRANGLER_CONFIG" dev --local --port "$PORT" --ip localhost --persist-to "$PERSIST_DIR"
