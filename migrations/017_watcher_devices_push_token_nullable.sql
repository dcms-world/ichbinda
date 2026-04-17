-- Make watcher_devices.push_token nullable
-- Commit a14e418 changed POST /api/watcher to pass NULL when no push_token is sent
-- (web clients without push support), but the NOT NULL constraint from migration 002
-- was not removed at that point. This migration fixes the schema drift.
ALTER TABLE watcher_devices DROP COLUMN push_token;
ALTER TABLE watcher_devices ADD COLUMN push_token TEXT;
