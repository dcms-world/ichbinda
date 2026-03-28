-- Migration: API Keys für Gerät-Authentifizierung
-- Anwenden mit: wrangler d1 execute dev-ibinda-db --file=migration_device_keys.sql
-- Lokal:        wrangler d1 execute dev-ibinda-db --local --file=migration_device_keys.sql

CREATE TABLE IF NOT EXISTS device_keys (
  device_id TEXT PRIMARY KEY,
  key_hash TEXT NOT NULL,
  created_at DATETIME NOT NULL
);
