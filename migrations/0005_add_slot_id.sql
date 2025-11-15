-- Add slot_id column to slots table for custom slot IDs (web0001, mob0001, etc.)
ALTER TABLE slots 
ADD COLUMN IF NOT EXISTS slot_id TEXT;

-- Create index for faster lookups by slot_id
CREATE INDEX IF NOT EXISTS idx_slots_slot_id ON slots(slot_id);

