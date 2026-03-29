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
