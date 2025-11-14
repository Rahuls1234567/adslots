-- Add PO approval tracking columns to work_orders table
ALTER TABLE "work_orders"
  ADD COLUMN IF NOT EXISTS "po_approved" boolean DEFAULT false NOT NULL;

ALTER TABLE "work_orders"
  ADD COLUMN IF NOT EXISTS "po_approved_at" timestamp;


