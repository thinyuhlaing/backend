import { date, integer, numeric, pgTable, varchar } from 'drizzle-orm/pg-core';
import { abstractBaseSchemaColumns } from 'src/common/base/base.schema';
import { users } from 'src/users/schema/users.schema';

export const orders = pgTable('orders', {
  ...abstractBaseSchemaColumns,
  orderNumber: varchar('order_number', { length: 100 }).notNull(),
  customerId: integer('customer_id')
    .notNull()
    .references(() => users.id),
  orderDate: date('order_date').notNull(),
  total: numeric('total', { precision: 10, scale: 2 }).notNull(),
  status: varchar('status', { length: 100 }).notNull(),
});
