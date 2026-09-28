import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const users = sqliteTable('users', {
  id: text('id').primaryKey(), // crypto.randomUUID()
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: text('role', { enum: ['admin', 'user'] }).notNull().default('user'),
  isActive: integer('is_active').notNull().default(1),
  createdAt: integer('created_at').notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at').notNull().default(sql`(unixepoch())`),
});

export const invites = sqliteTable('invites', {
  id: text('id').primaryKey(),
  code: text('code').notNull().unique(),
  email: text('email'),
  createdByUserId: text('created_by_user_id').notNull().references(() => users.id),
  usedByUserId: text('used_by_user_id').references(() => users.id),
  expiresAt: integer('expires_at'),
  createdAt: integer('created_at').notNull().default(sql`(unixepoch())`),
});