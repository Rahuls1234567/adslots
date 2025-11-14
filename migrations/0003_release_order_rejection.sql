ALTER TABLE "release_orders"
  ADD COLUMN IF NOT EXISTS "rejection_reason" text,
  ADD COLUMN IF NOT EXISTS "rejected_by_id" integer REFERENCES "users"("id"),
  ADD COLUMN IF NOT EXISTS "rejected_at" timestamp;

