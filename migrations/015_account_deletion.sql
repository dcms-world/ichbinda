-- Soft-Delete für Konten
ALTER TABLE persons ADD COLUMN deleted_at DATETIME;
ALTER TABLE watchers ADD COLUMN deleted_at DATETIME;
