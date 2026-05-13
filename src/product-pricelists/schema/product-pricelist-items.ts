import { integer, numeric, pgTable, timestamp, varchar } from 'drizzle-orm/pg-core';
import { abstractBaseSchemaColumns } from 'src/common/base/base.schema';
import { productPricelists } from './product-pricelists';

export const productPricelistItems = pgTable('product_pricelist_items', {
    ...abstractBaseSchemaColumns,
    pricelistId: integer("pricelist_id")
        .notNull()
        .references(() => productPricelists.id, {
            onDelete: "cascade",
        }),

    productId: integer("product_id"),
    base: varchar("base", { length: 50 }).notNull(),
    computePrice: varchar("compute_price", { length: 50 }).notNull(),

    fixedPrice: numeric("fixed_price", {
        precision: 10,
        scale: 2,
    }).notNull(),

    priceDiscount: numeric("price_discount", {
        precision: 5,
        scale: 2,
    }).notNull().default("0"),
});
