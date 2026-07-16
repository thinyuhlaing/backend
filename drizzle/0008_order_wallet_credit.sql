ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "wallet_credited" boolean DEFAULT false;
