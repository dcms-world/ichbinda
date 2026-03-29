-- Migration: pairing_requests für explizites Pairing zwischen Person und Watcher
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
