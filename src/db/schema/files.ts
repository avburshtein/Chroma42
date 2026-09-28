import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { users } from './users';

export const files = sqliteTable('files', {
  id: text('id').primaryKey(),
  uploaderId: text('uploader_id').notNull().references(() => users.id),
  r2Key: text('r2_key').notNull().unique(),
  fileName: text('file_name').notNull(),
  mimeType: text('mime_type').notNull(),
  sizeBytes: integer('size_bytes').notNull(),
  width: integer('width'),
  height: integer('height'),
  createdAt: integer('created_at').notNull().default(sql`(unixepoch())`),
});