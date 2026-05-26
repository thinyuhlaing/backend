import { numeric, pgTable, serial, varchar } from 'drizzle-orm/pg-core';

export const simpleProducts = pgTable('simple_products', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  price: numeric('price', { precision: 10, scale: 2 }).notNull(),
});
