-- ============================================
-- UPDATE EXISTING WORK ORDERS WITH CLIENT INFORMATION
-- ============================================
-- This script updates work_orders table to populate business_school_name 
-- and contact_name from the users table for existing records that have null values.
-- ============================================
-- IMPORTANT: If you get a transaction error, run ROLLBACK; first, then run this script again.
-- ============================================

-- Step 1: Update business_school_name from users table
UPDATE work_orders wo
SET business_school_name = u.business_school_name
FROM users u
WHERE wo.client_id = u.id
  AND wo.business_school_name IS NULL
  AND u.business_school_name IS NOT NULL;

-- Step 2: Update contact_name from users table (use client's name)
UPDATE work_orders wo
SET contact_name = u.name
FROM users u
WHERE wo.client_id = u.id
  AND wo.contact_name IS NULL
  AND u.name IS NOT NULL;

-- ============================================
-- VERIFICATION
-- ============================================
-- Check how many records were updated and verify results:
-- 
-- 1. Count work orders with null business_school_name (should be 0 after update):
--    SELECT COUNT(*) FROM work_orders WHERE business_school_name IS NULL;
--
-- 2. Count work orders with null contact_name (should be 0 after update):
--    SELECT COUNT(*) FROM work_orders WHERE contact_name IS NULL;
--
-- 3. View updated work orders:
--    SELECT 
--      wo.id, 
--      wo.client_id, 
--      wo.business_school_name, 
--      wo.contact_name,
--      u.name as client_name,
--      u.business_school_name as client_business_school
--    FROM work_orders wo
--    LEFT JOIN users u ON wo.client_id = u.id
--    ORDER BY wo.id;
-- ============================================

