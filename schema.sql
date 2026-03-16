-- Person (die Überwachte) - anonym, nur UUID
CREATE TABLE IF NOT EXISTS persons (
  id TEXT PRIMARY KEY,
  last_heartbeat DATETIME
);

-- Betreuer (Watcher) - Push-Token nötig für Benachrichtigung
CREATE TABLE IF NOT EXISTS watchers (
  id TEXT PRIMARY KEY,
  push_token TEXT NOT NULL
);

-- Verknüpfung + individuelle Einstellungen
CREATE TABLE IF NOT EXISTS watch_relations (
  person_id TEXT,
  watcher_id TEXT,
  check_interval_hours INTEGER DEFAULT 24,
  last_notified_at DATETIME,
  PRIMARY KEY (person_id, watcher_id),
  FOREIGN KEY (person_id) REFERENCES persons(id),
  FOREIGN KEY (watcher_id) REFERENCES watchers(id)
);
