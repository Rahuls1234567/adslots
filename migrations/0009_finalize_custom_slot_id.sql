-- Finalize the migration: Make custom_slot_id NOT NULL in bookings and remove old slot_id columns
-- Run this AFTER populating the data with migration 0008

-- Make custom_slot_id NOT NULL for bookings (after data is populated)
ALTER TABLE bookings 
ALTER COLUMN custom_slot_id SET NOT NULL;

-- Now safe to remove old slot_id foreign keys
ALTER TABLE bookings 
DROP CONSTRAINT IF EXISTS bookings_slot_id_slots_id_fk;

ALTER TABLE bookings 
DROP COLUMN IF EXISTS slot_id;

-- Work Order Items: Remove slot_id (custom_slot_id can stay nullable for addons)
ALTER TABLE work_order_items 
DROP CONSTRAINT IF EXISTS work_order_items_slot_id_slots_id_fk;

ALTER TABLE work_order_items 
DROP COLUMN IF EXISTS slot_id;

-- Deployments: Remove slot_id (custom_slot_id can stay nullable)
ALTER TABLE deployments 
DROP CONSTRAINT IF EXISTS deployments_slot_id_slots_id_fk;

ALTER TABLE deployments 
DROP COLUMN IF EXISTS slot_id;

