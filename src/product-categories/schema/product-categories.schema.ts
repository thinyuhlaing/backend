import { integer, pgTable, text, varchar } from 'drizzle-orm/pg-core';
import { abstractBaseSchemaColumns } from 'src/common/base/base.schema';

export const productCategories = pgTable('product_categories', {
  ...abstractBaseSchemaColumns,
  name: varchar('name', { length: 255 }).notNull(),
  completeName: text('complete_name'),
  parentId: integer('parent_id'),
});
