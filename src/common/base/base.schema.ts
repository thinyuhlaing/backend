import { boolean, integer, timestamp } from 'drizzle-orm/pg-core';

export const abstractBaseSchemaColumns = {
  id: integer('id').primaryKey().generatedByDefaultAsIdentity(),

  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
  createdBy: integer('created_by'),
  updatedBy: integer('updated_by'),
  isArchived: boolean('is_archived').default(false).notNull(),
};
