-- Add custom work order ID and release order ID columns
-- Format: WOWEB20260001, WOEMI20260001, WOWAP20260001, WOMAG20260001 (Work Orders)
-- Format: ROWEB20260001, ROEMI20260001, ROWAP20260001, ROMAG20260001 (Release Orders)

-- Work Orders table
ALTER TABLE work_orders 
ADD COLUMN IF NOT EXISTS custom_work_order_id TEXT;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_work_orders_custom_work_order_id ON work_orders(custom_work_order_id);

-- Release Orders table
ALTER TABLE release_orders 
ADD COLUMN IF NOT EXISTS custom_ro_number TEXT;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_release_orders_custom_ro_number ON release_orders(custom_ro_number);

