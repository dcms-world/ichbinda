-- Migration: watch_relations auf Soft-Delete umstellen
-- Neuer PK (AUTOINCREMENT), added_at, removed_at, kein unique constraint mehr

PRAGMA foreign_keys=OFF;

CREATE TABLE watch_relations_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  person_id TEXT NOT NULL,
  watcher_id TEXT NOT NULL,
  check_interval_minutes INTEGER DEFAULT 1440,
  added_at TEXT NOT NULL DEFAULT (datetime('now')),
  removed_at TEXT,
  last_notified_at DATETIME,
  FOREIGN KEY (person_id) REFERENCES persons(id),
  FOREIGN KEY (watcher_id) REFERENCES watchers(id)
);

INSERT INTO watch_relations_new (person_id, watcher_id, check_interval_minutes, last_notified_at)
SELECT person_id, watcher_id, check_interval_minutes, last_notified_at FROM watch_relations;

DROP TABLE watch_relations;

ALTER TABLE watch_relations_new RENAME TO watch_relations;

PRAGMA foreign_keys=ON;
