-- Add custom_slot_id column to tables that reference slots
-- This stores the custom slot ID (web0001, mob0001, etc.) in addition to the numeric slot_id

-- Bookings table
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS custom_slot_id TEXT;

-- Work Order Items table
ALTER TABLE work_order_items 
ADD COLUMN IF NOT EXISTS custom_slot_id TEXT;

-- Deployments table
ALTER TABLE deployments 
ADD COLUMN IF NOT EXISTS custom_slot_id TEXT;

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_bookings_custom_slot_id ON bookings(custom_slot_id);
CREATE INDEX IF NOT EXISTS idx_work_order_items_custom_slot_id ON work_order_items(custom_slot_id);
CREATE INDEX IF NOT EXISTS idx_deployments_custom_slot_id ON deployments(custom_slot_id);

