-- Add 'whatsapp' to the media_type enum
-- First, check if the enum value already exists
DO $$
BEGIN
  -- Check if 'whatsapp' value exists in the enum
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'whatsapp' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'media_type')
  ) THEN
    -- Add 'whatsapp' to the media_type enum
    ALTER TYPE media_type ADD VALUE IF NOT EXISTS 'whatsapp';
  END IF;
END $$;

