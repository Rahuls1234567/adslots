-- Add 'ready_for_material' status to release_order_status enum
ALTER TYPE release_order_status ADD VALUE IF NOT EXISTS 'ready_for_material';

