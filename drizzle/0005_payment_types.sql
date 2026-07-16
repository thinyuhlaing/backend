ALTER TABLE "payment_methods" ADD COLUMN IF NOT EXISTS "description" text;
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'payment_methods'
      AND column_name = 'details'
  ) THEN
    EXECUTE 'UPDATE "payment_methods" SET "description" = "details" WHERE "description" IS NULL';
  END IF;
END $$;
ALTER TABLE "payment_methods" ADD COLUMN IF NOT EXISTS "is_active" boolean DEFAULT true NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "payment_methods_code_unique" ON "payment_methods" ("code");
