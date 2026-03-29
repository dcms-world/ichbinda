ALTER TABLE device_link_requests ADD COLUMN requested_device_id TEXT;
ALTER TABLE device_link_requests ADD COLUMN requested_device_model TEXT;
ALTER TABLE device_link_requests ADD COLUMN requested_person_id TEXT;
ALTER TABLE device_link_requests ADD COLUMN requested_at TEXT;
ALTER TABLE device_link_requests ADD COLUMN rejected_at TEXT;
