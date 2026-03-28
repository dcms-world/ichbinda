-- Migration: Personen-Limit pro Watcher in DB hinterlegen
ALTER TABLE watchers ADD COLUMN max_persons INTEGER NOT NULL DEFAULT 2;
