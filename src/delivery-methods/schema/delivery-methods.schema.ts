import { pgTable, varchar, numeric } from "drizzle-orm/pg-core";
import { abstractBaseSchemaColumns } from "src/common/base/base.schema";

export const deliveryMethods = pgTable("delivery_methods", {
  ...abstractBaseSchemaColumns,
  name: varchar("name", { length: 255 }).notNull(),
  fixedPrice: numeric("fixed_price", {
    precision: 10,
    scale: 2,
  }).notNull(),
});