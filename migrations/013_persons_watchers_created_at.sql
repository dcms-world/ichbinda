-- created_at für persons und watchers
-- Hinweis: SQLite erlaubt bei ALTER TABLE ADD COLUMN keinen non-constant DEFAULT,
-- daher nullable ohne DEFAULT. Neue Zeilen setzen created_at explizit im Code.
ALTER TABLE persons ADD COLUMN created_at DATETIME;
ALTER TABLE watchers ADD COLUMN created_at DATETIME;
