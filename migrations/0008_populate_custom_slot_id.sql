-- Populate custom_slot_id from existing slot_id foreign keys
-- This migration populates the custom_slot_id columns by looking up the slot's custom ID

-- Populate bookings.custom_slot_id from slots.slot_id
UPDATE bookings b
SET custom_slot_id = s.slot_id
FROM slots s
WHERE b.slot_id = s.id
  AND s.slot_id IS NOT NULL
  AND b.custom_slot_id IS NULL;

-- Populate work_order_items.custom_slot_id from slots.slot_id
UPDATE work_order_items woi
SET custom_slot_id = s.slot_id
FROM slots s
WHERE woi.slot_id = s.id
  AND s.slot_id IS NOT NULL
  AND woi.custom_slot_id IS NULL;

-- Populate deployments.custom_slot_id from slots.slot_id
UPDATE deployments d
SET custom_slot_id = s.slot_id
FROM slots s
WHERE d.slot_id = s.id
  AND s.slot_id IS NOT NULL
  AND d.custom_slot_id IS NULL;

