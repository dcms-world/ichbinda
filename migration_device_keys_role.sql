-- Migration: role-Spalte zu device_keys hinzufügen
-- Anwenden mit: wrangler d1 execute dev-ibinda-db --remote --file=migration_device_keys_role.sql
-- Lokal:        wrangler d1 execute dev-ibinda-db --local --file=migration_device_keys_role.sql

ALTER TABLE device_keys ADD COLUMN role TEXT NOT NULL DEFAULT 'person' CHECK(role IN ('person', 'watcher'));
