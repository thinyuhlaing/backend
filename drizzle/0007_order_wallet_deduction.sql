ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "wallet_deducted" boolean DEFAULT false;
