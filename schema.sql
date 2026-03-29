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
  push_token TEXT NOT NULL DEFAULT '',
  max_persons INTEGER NOT NULL DEFAULT 2
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

-- Kurzlebige Pairing-Tokens für das explizite Verbinden zwischen Person und Watcher
CREATE TABLE IF NOT EXISTS pairing_requests (
  pairing_token TEXT PRIMARY KEY,
  person_id TEXT NOT NULL,
  watcher_name TEXT,
  watcher_device_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'completed', 'expired')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at TEXT,
  FOREIGN KEY (person_id) REFERENCES persons(id)
);
CREATE INDEX IF NOT EXISTS idx_pairing_requests_person_status
  ON pairing_requests(person_id, status);
CREATE INDEX IF NOT EXISTS idx_pairing_requests_created
  ON pairing_requests(created_at);

-- Rate Limiting für Heartbeats (1 pro 5 Sekunden pro Gerät)
CREATE TABLE IF NOT EXISTS device_rate_limits (
  device_id TEXT PRIMARY KEY,
  last_heartbeat_at TEXT NOT NULL
);

-- Zuletzt bekannter Anzeigename pro verbundener Person
CREATE TABLE IF NOT EXISTS watcher_name_announcements (
  watcher_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT (datetime('now'))
);

-- Persistente Ereignisse fuer Verbindungsabbrueche, bis die Person sie bestaetigt
CREATE TABLE IF NOT EXISTS watcher_disconnect_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  person_id TEXT NOT NULL,
  watcher_id TEXT NOT NULL,
  watcher_name_snapshot TEXT,
  created_at DATETIME NOT NULL DEFAULT (datetime('now')),
  acknowledged_at DATETIME,
  FOREIGN KEY (person_id) REFERENCES persons(id),
  FOREIGN KEY (watcher_id) REFERENCES watchers(id)
);
CREATE INDEX IF NOT EXISTS idx_watcher_disconnect_events_person_ack
  ON watcher_disconnect_events(person_id, acknowledged_at, created_at DESC);

-- API Keys für Gerät-Authentifizierung (nur Hash gespeichert, nie Klartext)
CREATE TABLE IF NOT EXISTS device_keys (
  device_id TEXT PRIMARY KEY,
  key_hash TEXT NOT NULL,
  created_at DATETIME NOT NULL,
  role TEXT NOT NULL DEFAULT 'person' CHECK(role IN ('person', 'watcher'))
);
