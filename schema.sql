-- Person (die Überwachte) - anonym, nur UUID
CREATE TABLE IF NOT EXISTS persons (
  id TEXT PRIMARY KEY,
  last_heartbeat DATETIME,
  last_location_lat REAL,
  last_location_lng REAL
);

-- Betreuer (Watcher) - Identität
-- Hinweis: push_token ist ein DB-Überbleibsel (NOT NULL, leer gesetzt), wird nicht mehr verwendet
CREATE TABLE IF NOT EXISTS watchers (
  id TEXT PRIMARY KEY,
  push_token TEXT NOT NULL DEFAULT ''
);

-- Geräte pro Watcher (Multi-Device Support)
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

-- Verknüpfung + individuelle Einstellungen (in Minuten gespeichert)
-- Kein Hard-Delete: removed_at wird gesetzt statt Zeile zu löschen (Audit-Trail)
CREATE TABLE IF NOT EXISTS watch_relations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  person_id TEXT NOT NULL,
  watcher_id TEXT NOT NULL,
  check_interval_minutes INTEGER DEFAULT 1440,  -- 24h = 1440 Minuten
  added_at TEXT NOT NULL DEFAULT (datetime('now')),
  removed_at TEXT,
  last_notified_at DATETIME,
  FOREIGN KEY (person_id) REFERENCES persons(id),
  FOREIGN KEY (watcher_id) REFERENCES watchers(id)
);

-- Geräte pro Person (Multi-Device Support)
CREATE TABLE IF NOT EXISTS person_devices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  person_id TEXT NOT NULL,
  device_id TEXT NOT NULL UNIQUE,
  device_model TEXT NOT NULL,
  last_seen DATETIME NOT NULL,
  FOREIGN KEY (person_id) REFERENCES persons(id)
);
CREATE INDEX IF NOT EXISTS idx_person_devices_person_id_last_seen
  ON person_devices(person_id, last_seen DESC);

-- Rate Limiting für Heartbeats (1 pro 5 Minuten pro Gerät)
CREATE TABLE IF NOT EXISTS device_rate_limits (
  device_id TEXT PRIMARY KEY,
  last_heartbeat_at TEXT NOT NULL
);

-- Einmal-lesbare Watcher-Namen: Watcher kündigt seinen Namen an, Person liest ihn einmal und löscht ihn
CREATE TABLE IF NOT EXISTS watcher_name_announcements (
  watcher_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT (datetime('now'))
);

-- API Keys für Gerät-Authentifizierung (nur Hash gespeichert, nie Klartext)
CREATE TABLE IF NOT EXISTS device_keys (
  device_id TEXT PRIMARY KEY,
  key_hash TEXT NOT NULL,
  created_at DATETIME NOT NULL,
  role TEXT NOT NULL DEFAULT 'person' CHECK(role IN ('person', 'watcher'))
);
