-- Create ro_details table
CREATE TABLE IF NOT EXISTS ro_details (
  id SERIAL PRIMARY KEY,
  media_type TEXT NOT NULL,
  position TEXT NOT NULL,
  status INTEGER NOT NULL DEFAULT 0,
  property_prefix TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Add unique constraint on (media_type, position) if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'ro_details_media_type_position_key'
  ) THEN
    ALTER TABLE ro_details ADD CONSTRAINT ro_details_media_type_position_key 
    UNIQUE (media_type, position);
  END IF;
END $$;

-- Create index on property_prefix for faster lookups
CREATE INDEX IF NOT EXISTS idx_ro_details_property_prefix ON ro_details(property_prefix);

-- Create index on media_type for faster lookups
CREATE INDEX IF NOT EXISTS idx_ro_details_media_type ON ro_details(media_type);

