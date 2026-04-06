-- Remove location columns from persons table
ALTER TABLE persons DROP COLUMN last_location_lat;
ALTER TABLE persons DROP COLUMN last_location_lng;
