-- Verhindert doppelte aktive Verbindungen zwischen derselben Person und demselben Watcher
-- (Race Condition in POST /api/pair/confirm, Security #32)
CREATE UNIQUE INDEX IF NOT EXISTS uq_watch_relations_active
  ON watch_relations (person_id, watcher_id)
  WHERE removed_at IS NULL;
