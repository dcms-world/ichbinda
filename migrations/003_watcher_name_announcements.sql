-- Migration: Einmal-lesbare Watcher-Namen (read-once, kein Dauerfeld)
CREATE TABLE IF NOT EXISTS watcher_name_announcements (
  watcher_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT (datetime('now'))
);
