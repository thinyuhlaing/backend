ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "payment_type" varchar(100);
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "shipping_amount" numeric(10, 2) DEFAULT 0 NOT NULL;
