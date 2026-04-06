-- push_token für person_devices (für Erinnerungs-Pushes an die Person)
ALTER TABLE person_devices ADD COLUMN push_token TEXT;
