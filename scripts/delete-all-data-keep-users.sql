-- ============================================
-- DELETE ALL DATA BUT KEEP USERS
-- ============================================
-- This script deletes all business data but keeps all users.
-- Use this if you want to keep your login accounts and start fresh with data.
-- 
-- After running this script, you CAN still save new data - tables are preserved!
-- You can login immediately after running this script (users are kept).
-- ============================================

BEGIN;

-- Delete all business data (keeping users table intact)

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

-- Note: Users table is NOT truncated - all users are preserved!

-- Reset sequences (except users_id_seq since users are kept)
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
-- VERIFICATION
-- ============================================
-- Check data counts (users should still have data)
SELECT 
    'users' as table_name, COUNT(*) as row_count FROM users
UNION ALL
SELECT 'slots', COUNT(*) FROM slots
UNION ALL
SELECT 'bookings', COUNT(*) FROM bookings
UNION ALL
SELECT 'work_orders', COUNT(*) FROM work_orders
UNION ALL
SELECT 'release_orders', COUNT(*) FROM release_orders;

-- ============================================
-- ✅ YES, YOU CAN SAVE NEW DATA AFTER THIS!
-- ============================================
-- All users are preserved - you can login immediately.
-- Business data is deleted but tables are ready for new data.
-- 
-- You can now:
-- 1. Login with your existing user account
-- 2. Create new slots, bookings, work orders, etc.
-- 3. All new data will be saved normally
-- ============================================

