ALTER TABLE "work_orders"
  ADD COLUMN IF NOT EXISTS "negotiation_requested" boolean DEFAULT false NOT NULL;

ALTER TABLE "work_orders"
  ADD COLUMN IF NOT EXISTS "negotiation_reason" text;

ALTER TABLE "work_orders"
  ADD COLUMN IF NOT EXISTS "negotiation_requested_at" timestamp;

