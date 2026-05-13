import { pgTable, varchar } from 'drizzle-orm/pg-core';
import { abstractBaseSchemaColumns } from 'src/common/base/base.schema';

export const productPricelists = pgTable('product_pricelists', {
    ...abstractBaseSchemaColumns,
    name: varchar('name', { length: 255 }).notNull(),
});
