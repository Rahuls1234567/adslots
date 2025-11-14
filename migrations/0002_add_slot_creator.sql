ALTER TABLE "slots"
  ADD COLUMN IF NOT EXISTS "created_by_id" integer REFERENCES "users"("id");

