-- Replace push_token with last_seen on watchers (analogous to persons.last_heartbeat)
ALTER TABLE watchers DROP COLUMN push_token;
ALTER TABLE watchers ADD COLUMN last_seen DATETIME;
