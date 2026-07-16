ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "status" varchar(50) DEFAULT 'Active' NOT NULL;
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "wallet_amount" numeric(12, 2) DEFAULT 0 NOT NULL;
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "payment_type" varchar(100);
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "vip_level" integer DEFAULT 0 NOT NULL;
