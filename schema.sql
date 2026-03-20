-- Person (die Überwachte) - anonym, nur UUID
CREATE TABLE IF NOT EXISTS persons (
  id TEXT PRIMARY KEY,
  last_heartbeat DATETIME,
  last_location_lat REAL,
  last_location_lng REAL
);

-- Betreuer (Watcher) - Push-Token nötig für Benachrichtigung
CREATE TABLE IF NOT EXISTS watchers (
  id TEXT PRIMARY KEY,
  push_token TEXT NOT NULL
);

-- Verknüpfung + individuelle Einstellungen (in Minuten gespeichert)
CREATE TABLE IF NOT EXISTS watch_relations (
  person_id TEXT,
  watcher_id TEXT,
  check_interval_minutes INTEGER DEFAULT 1440,  -- 24h = 1440 Minuten
  last_notified_at DATETIME,
  PRIMARY KEY (person_id, watcher_id),
  FOREIGN KEY (person_id) REFERENCES persons(id),
  FOREIGN KEY (watcher_id) REFERENCES watchers(id)
);

-- Rate Limiting für Heartbeats (1 pro 5 Minuten pro Gerät)
CREATE TABLE IF NOT EXISTS device_rate_limits (
  device_id TEXT PRIMARY KEY,
  last_heartbeat_at TEXT NOT NULL
);
