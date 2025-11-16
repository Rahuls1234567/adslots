-- Check if the enum type exists
SELECT typname, typtype 
FROM pg_type 
WHERE typname = 'release_order_status';

-- Check current enum values
SELECT enumlabel 
FROM pg_enum 
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'release_order_status')
ORDER BY enumsortorder;

-- Add 'ready_for_material' status to release_order_status enum (if it doesn't exist)
ALTER TYPE release_order_status ADD VALUE IF NOT EXISTS 'ready_for_material';

-- Verify it was added
SELECT enumlabel 
FROM pg_enum 
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'release_order_status')
ORDER BY enumsortorder;

