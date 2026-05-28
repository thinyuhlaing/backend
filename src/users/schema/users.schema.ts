import { pgEnum, pgTable, serial, timestamp, varchar } from 'drizzle-orm/pg-core';
import { UserRole } from '../enums/user-role.enum';

export const userRoleEnum = pgEnum('user_role', [
  UserRole.INTERNAL_USER,
  UserRole.PORTAL_USER,
  UserRole.PUBLIC_USER,
]);

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  login: varchar('login', { length: 255 }).notNull().unique(),
  password: varchar('password', { length: 255 }).notNull(),
  refreshTokenHash: varchar('refresh_token_hash', { length: 255 }),
  userRole: userRoleEnum('user_role').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});
