import {
  boolean,
  integer,
  pgEnum,
  pgTable,
  serial,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core';
import { UserRole } from '../enums/user-role.enum';

export const userRoleEnum = pgEnum('user_role', [
  UserRole.INTERNAL_USER,
  UserRole.PORTAL_USER,
  UserRole.PUBLIC_USER,
]);

export const users = pgTable('users', {
  // id: serial('id').primaryKey(),
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),

  login: varchar('login', { length: 255 }).notNull().unique(),
  password: varchar('password', { length: 255 }).notNull(),
  isVerified: boolean('is_verified').default(false).notNull(),
  refreshTokenHash: varchar('refresh_token_hash', { length: 255 }),
  emailVerifiedAt: timestamp('email_verified_at', { withTimezone: true }),
  emailVerificationTokenHash: varchar('email_verification_token_hash', {
    length: 255,
  }),
  emailVerificationTokenExpiresAt: timestamp(
    'email_verification_token_expires_at',
    { withTimezone: true },
  ),
  userRole: userRoleEnum('user_role').notNull(),
  status: varchar('status', { length: 50 }).default('Active').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});
