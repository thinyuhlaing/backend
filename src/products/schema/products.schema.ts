import {
  boolean,
  integer,
  numeric,
  pgTable,
  text,
  varchar,
} from 'drizzle-orm/pg-core';
import { abstractBaseSchemaColumns } from 'src/common/base/base.schema';
import { productCategories } from 'src/product-categories/schema/product-categories.schema';

export const products = pgTable('products', {
  ...abstractBaseSchemaColumns,
  name: varchar('name', { length: 255 }).notNull(),
  categoryId: integer('category_id')
    .references(() => productCategories.id)
    .notNull(),
  description: text('description'),
  imageUrl: varchar('image_url', { length: 500 }), // ✅ ADD THIS
  salePrice: numeric('sale_price', { precision: 10, scale: 2 }).notNull(),
  costPrice: numeric('cost_price', { precision: 10, scale: 2 }).notNull(),
  inStock: boolean('in_stock').default(true).notNull(),
  isPublished: boolean('is_published').default(false).notNull(),
});
