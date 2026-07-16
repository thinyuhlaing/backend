import {
  boolean,
  date,
  integer,
  numeric,
  pgTable,
  varchar,
} from 'drizzle-orm/pg-core';
import { abstractBaseSchemaColumns } from 'src/common/base/base.schema';
import { products } from 'src/products/schema/products.schema';
import { users } from 'src/users/schema/users.schema';

export const orders = pgTable('orders', {
  ...abstractBaseSchemaColumns,
  orderNumber: varchar('order_number', { length: 100 }).notNull(),
  customerId: integer('customer_id').references(() => users.id),
  customerName: varchar('customer_name', { length: 255 }),
  customerEmail: varchar('customer_email', { length: 255 }),
  orderDate: date('order_date').notNull(),
  shippingAddress: varchar('shipping_address', { length: 1000 }),
  contactPhone: varchar('contact_phone', { length: 50 }),
  paymentType: varchar('payment_type', { length: 100 }),
  notes: varchar('notes', { length: 1000 }),
  shippingAmount: numeric('shipping_amount', { precision: 10, scale: 2 })
    .default('0')
    .notNull(),
  total: numeric('total', { precision: 10, scale: 2 }).notNull(),
  walletDeducted: boolean('wallet_deducted').default(false),
  // .notNull(),
  walletCredited: boolean('wallet_credited').default(false),
  // .notNull(),
  status: varchar('status', { length: 100 }).notNull(),
});

export const orderItems = pgTable('order_items', {
  ...abstractBaseSchemaColumns,
  orderId: integer('order_id')
    .notNull()
    .references(() => orders.id, { onDelete: 'cascade' }),
  productId: integer('product_id')
    .notNull()
    .references(() => products.id),
  quantity: integer('quantity').notNull(),
  productPrice: numeric('product_price', { precision: 10, scale: 2 }).notNull(),
  subtotal: numeric('subtotal', { precision: 10, scale: 2 }).notNull(),
});

export const walletHistory = pgTable('wallet_history', {
  ...abstractBaseSchemaColumns,
  userId: integer('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  orderId: integer('order_id').references(() => orders.id, {
    onDelete: 'set null',
  }),
  type: varchar('type', { length: 20 }).notNull(),
  amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
  balanceBefore: numeric('balance_before', {
    precision: 12,
    scale: 2,
  }).notNull(),
  balanceAfter: numeric('balance_after', {
    precision: 12,
    scale: 2,
  }).notNull(),
  description: varchar('description', { length: 255 }).notNull(),
  status: varchar('status', { length: 50 }).default('Completed').notNull(),
});
