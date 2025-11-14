-- ============================================
-- DELETE ALL DATA FROM DATABASE (KEEP USERS)
-- ============================================
-- IMPORTANT: This script deletes ALL DATA but keeps table structure intact.
-- After running this script, you CAN still save new data - tables are preserved!
-- 
-- ✅ USERS TABLE IS PRESERVED - All users remain in the database!
-- You can login immediately after running this script.
-- 
-- What gets deleted: All business data (slots, bookings, work orders, etc.)
-- What is preserved: All users, table structure, columns, constraints, indexes
-- ============================================

BEGIN;

-- Delete all business data from all tables (CASCADE handles foreign key dependencies)
-- Tables structure remains intact - you can still insert new data after this!
-- NOTE: Users table is NOT truncated - all users are preserved!

TRUNCATE TABLE analytics CASCADE;
TRUNCATE TABLE version_history CASCADE;
TRUNCATE TABLE deployments CASCADE;
TRUNCATE TABLE release_order_items CASCADE;
TRUNCATE TABLE release_orders CASCADE;
TRUNCATE TABLE activity_logs CASCADE;
TRUNCATE TABLE invoices CASCADE;
TRUNCATE TABLE work_order_items CASCADE;
TRUNCATE TABLE work_orders CASCADE;
TRUNCATE TABLE notifications CASCADE;
TRUNCATE TABLE proposals CASCADE;
TRUNCATE TABLE installments CASCADE;
TRUNCATE TABLE payments CASCADE;
TRUNCATE TABLE approvals CASCADE;
TRUNCATE TABLE banners CASCADE;
TRUNCATE TABLE bookings CASCADE;
TRUNCATE TABLE slots CASCADE;
TRUNCATE TABLE otp_codes CASCADE;

-- ✅ USERS TABLE IS NOT DELETED - All users are preserved!
-- You can login immediately after running this script with your existing user account.

-- Reset all sequences (auto-increment IDs) to start from 1
-- This ensures new records start with ID = 1
-- NOTE: users_id_seq is NOT reset since users are kept
ALTER SEQUENCE analytics_id_seq RESTART WITH 1;
ALTER SEQUENCE version_history_id_seq RESTART WITH 1;
ALTER SEQUENCE deployments_id_seq RESTART WITH 1;
ALTER SEQUENCE release_order_items_id_seq RESTART WITH 1;
ALTER SEQUENCE release_orders_id_seq RESTART WITH 1;
ALTER SEQUENCE activity_logs_id_seq RESTART WITH 1;
ALTER SEQUENCE invoices_id_seq RESTART WITH 1;
ALTER SEQUENCE work_order_items_id_seq RESTART WITH 1;
ALTER SEQUENCE work_orders_id_seq RESTART WITH 1;
ALTER SEQUENCE notifications_id_seq RESTART WITH 1;
ALTER SEQUENCE proposals_id_seq RESTART WITH 1;
ALTER SEQUENCE installments_id_seq RESTART WITH 1;
ALTER SEQUENCE payments_id_seq RESTART WITH 1;
ALTER SEQUENCE approvals_id_seq RESTART WITH 1;
ALTER SEQUENCE banners_id_seq RESTART WITH 1;
ALTER SEQUENCE bookings_id_seq RESTART WITH 1;
ALTER SEQUENCE slots_id_seq RESTART WITH 1;
ALTER SEQUENCE otp_codes_id_seq RESTART WITH 1;

COMMIT;

-- ============================================
-- VERIFICATION: Check data counts
-- ============================================
-- Users should still have data, all other tables should be empty
SELECT 
    'users' as table_name, COUNT(*) as row_count, 
    CASE WHEN COUNT(*) > 0 THEN '✅ PRESERVED' ELSE '❌ EMPTY' END as status
FROM users
UNION ALL
SELECT 'slots', COUNT(*), 
    CASE WHEN COUNT(*) = 0 THEN '✅ EMPTY' ELSE '⚠️ HAS DATA' END
FROM slots
UNION ALL
SELECT 'bookings', COUNT(*), 
    CASE WHEN COUNT(*) = 0 THEN '✅ EMPTY' ELSE '⚠️ HAS DATA' END
FROM bookings
UNION ALL
SELECT 'work_orders', COUNT(*), 
    CASE WHEN COUNT(*) = 0 THEN '✅ EMPTY' ELSE '⚠️ HAS DATA' END
FROM work_orders
UNION ALL
SELECT 'release_orders', COUNT(*), 
    CASE WHEN COUNT(*) = 0 THEN '✅ EMPTY' ELSE '⚠️ HAS DATA' END
FROM release_orders
UNION ALL
SELECT 'banners', COUNT(*), 
    CASE WHEN COUNT(*) = 0 THEN '✅ EMPTY' ELSE '⚠️ HAS DATA' END
FROM banners
UNION ALL
SELECT 'payments', COUNT(*), 
    CASE WHEN COUNT(*) = 0 THEN '✅ EMPTY' ELSE '⚠️ HAS DATA' END
FROM payments
UNION ALL
SELECT 'invoices', COUNT(*), 
    CASE WHEN COUNT(*) = 0 THEN '✅ EMPTY' ELSE '⚠️ HAS DATA' END
FROM invoices
UNION ALL
SELECT 'analytics', COUNT(*), 
    CASE WHEN COUNT(*) = 0 THEN '✅ EMPTY' ELSE '⚠️ HAS DATA' END
FROM analytics;

-- ============================================
-- VERIFICATION: Check that table structure is intact
-- ============================================
-- This confirms tables still exist and can accept new data
SELECT 
    table_name,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_schema = 'public'
    AND table_name IN ('users', 'slots', 'bookings', 'work_orders', 'release_orders')
ORDER BY table_name, ordinal_position
LIMIT 20;

-- ============================================
-- ✅ YES, YOU CAN SAVE NEW DATA AFTER THIS!
-- ============================================
-- The business data tables are empty but fully functional.
-- You can insert new records immediately after running this script.
-- 
-- ✅ ALL USERS ARE PRESERVED - You can login immediately!
-- 
-- NEXT STEPS:
-- ============================================
-- 1. ✅ Login with your existing user account (users are preserved!)
--
-- 2. Create new slots, bookings, work orders, etc. through the application
--
-- 3. All new data will be saved normally - tables are ready!
--
-- ============================================

