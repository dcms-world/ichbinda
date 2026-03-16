-- Migration: Stunden zu Minuten
-- Führt die Änderung durch: check_interval_hours -> check_interval_minutes

-- 1. Neue Spalte hinzufügen (vorübergehend beide vorhanden)
ALTER TABLE watch_relations ADD COLUMN check_interval_minutes INTEGER DEFAULT 1440;

-- 2. Bestehende Daten migrieren (Stunden * 60 = Minuten)
UPDATE watch_relations SET check_interval_minutes = check_interval_hours * 60;

-- 3. Alte Spalte entfernen (optional - erst nach Test)
-- ALTER TABLE watch_relations DROP COLUMN check_interval_hours;

-- Hinweis: In D1 (SQLite) ist DROP COLUMN eingeschränkt.
-- Alternative: Tabelle neu erstellen und Daten kopieren.