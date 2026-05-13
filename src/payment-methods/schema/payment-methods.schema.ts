import { boolean, pgTable, text, varchar } from 'drizzle-orm/pg-core';
import { abstractBaseSchemaColumns } from 'src/common/base/base.schema';

export const paymentMethods = pgTable('payment_methods', {
  ...abstractBaseSchemaColumns,
  name: varchar('name', { length: 255 }).notNull(),
  code: varchar('code', { length: 100 }).notNull(),
  details: text('details'),
  isActive: boolean('is_active').default(true).notNull(),
});
