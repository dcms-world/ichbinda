-- Migration: watcher_devices einführen
-- Hinweis: push_token bleibt in watchers als ungenutzte Spalte (D1 unterstützt kein DROP COLUMN ohne FK-Probleme)

CREATE TABLE IF NOT EXISTS watcher_devices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  watcher_id TEXT NOT NULL,
  device_id TEXT NOT NULL UNIQUE,
  push_token TEXT NOT NULL,
  device_model TEXT NOT NULL DEFAULT 'unknown',
  last_seen DATETIME NOT NULL,
  FOREIGN KEY (watcher_id) REFERENCES watchers(id)
);

CREATE INDEX IF NOT EXISTS idx_watcher_devices_watcher_id
  ON watcher_devices(watcher_id);
