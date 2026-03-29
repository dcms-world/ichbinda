CREATE TABLE IF NOT EXISTS device_link_requests (
  link_token TEXT PRIMARY KEY,
  person_id TEXT NOT NULL,
  mode TEXT NOT NULL CHECK(mode IN ('switch', 'add')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'completed', 'expired')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at TEXT,
  FOREIGN KEY (person_id) REFERENCES persons(id)
);

CREATE INDEX IF NOT EXISTS idx_device_link_requests_person_status
  ON device_link_requests(person_id, status);

CREATE INDEX IF NOT EXISTS idx_device_link_requests_created
  ON device_link_requests(created_at);
