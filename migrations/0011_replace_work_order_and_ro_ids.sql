-- Replace integer workOrderId and releaseOrderId with custom IDs
-- Step 1: Add new columns with custom IDs

-- Bookings table
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS custom_work_order_id TEXT;

-- Invoices table
ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS custom_work_order_id TEXT;

-- Work Order Items table
ALTER TABLE work_order_items 
ADD COLUMN IF NOT EXISTS custom_work_order_id TEXT;

-- Release Orders table
ALTER TABLE release_orders 
ADD COLUMN IF NOT EXISTS custom_work_order_id TEXT;

-- Release Order Items table
ALTER TABLE release_order_items 
ADD COLUMN IF NOT EXISTS custom_ro_number TEXT;

-- Deployments table
ALTER TABLE deployments 
ADD COLUMN IF NOT EXISTS custom_ro_number TEXT;

-- Step 2: Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_bookings_custom_work_order_id ON bookings(custom_work_order_id);
CREATE INDEX IF NOT EXISTS idx_invoices_custom_work_order_id ON invoices(custom_work_order_id);
CREATE INDEX IF NOT EXISTS idx_work_order_items_custom_work_order_id ON work_order_items(custom_work_order_id);
CREATE INDEX IF NOT EXISTS idx_release_orders_custom_work_order_id ON release_orders(custom_work_order_id);
CREATE INDEX IF NOT EXISTS idx_release_order_items_custom_ro_number ON release_order_items(custom_ro_number);
CREATE INDEX IF NOT EXISTS idx_deployments_custom_ro_number ON deployments(custom_ro_number);

-- Step 3: Populate custom IDs from existing foreign keys (migration data)
-- Note: Run these after ensuring all work_orders have custom_work_order_id populated
-- UPDATE bookings SET custom_work_order_id = (SELECT custom_work_order_id FROM work_orders WHERE work_orders.id = bookings.work_order_id) WHERE work_order_id IS NOT NULL;
-- UPDATE invoices SET custom_work_order_id = (SELECT custom_work_order_id FROM work_orders WHERE work_orders.id = invoices.work_order_id) WHERE work_order_id IS NOT NULL;
-- UPDATE work_order_items SET custom_work_order_id = (SELECT custom_work_order_id FROM work_orders WHERE work_orders.id = work_order_items.work_order_id) WHERE work_order_id IS NOT NULL;
-- UPDATE release_orders SET custom_work_order_id = (SELECT custom_work_order_id FROM work_orders WHERE work_orders.id = release_orders.work_order_id) WHERE work_order_id IS NOT NULL;
-- UPDATE release_order_items SET custom_ro_number = (SELECT custom_ro_number FROM release_orders WHERE release_orders.id = release_order_items.release_order_id) WHERE release_order_id IS NOT NULL;
-- UPDATE deployments SET custom_ro_number = (SELECT custom_ro_number FROM release_orders WHERE release_orders.id = deployments.release_order_id) WHERE release_order_id IS NOT NULL;

-- Step 4: Drop foreign key constraints
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_work_order_id_fkey;
ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_work_order_id_fkey;
ALTER TABLE work_order_items DROP CONSTRAINT IF EXISTS work_order_items_work_order_id_fkey;
ALTER TABLE release_orders DROP CONSTRAINT IF EXISTS release_orders_work_order_id_fkey;
ALTER TABLE release_order_items DROP CONSTRAINT IF EXISTS release_order_items_release_order_id_fkey;
ALTER TABLE deployments DROP CONSTRAINT IF EXISTS deployments_release_order_id_fkey;

-- Step 5: Drop old integer columns
ALTER TABLE bookings DROP COLUMN IF EXISTS work_order_id;
ALTER TABLE invoices DROP COLUMN IF EXISTS work_order_id;
ALTER TABLE work_order_items DROP COLUMN IF EXISTS work_order_id;
ALTER TABLE release_orders DROP COLUMN IF EXISTS work_order_id;
ALTER TABLE release_order_items DROP COLUMN IF EXISTS release_order_id;
ALTER TABLE deployments DROP COLUMN IF EXISTS release_order_id;

