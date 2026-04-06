-- Namen werden nicht mehr dauerhaft gespeichert (nur einmalig beim Pairing übertragen)
DROP TABLE IF EXISTS watcher_name_announcements;
ALTER TABLE watcher_disconnect_events DROP COLUMN watcher_name_snapshot;
