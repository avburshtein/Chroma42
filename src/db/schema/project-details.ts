import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { projects } from './projects';
import { files } from './files';

// Sec 03: Persona Card
export const projectPersonas = sqliteTable('project_personas', {
    id: text('id').primaryKey(),
    projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
    nameAndAge: text('name_and_age').notNull(),
    avatarFileId: text('avatar_file_id').references(() => files.id),
    role: text('role').notNull(),
    description: text('description').notNull(),
});

// Sec 03: Key Metrics (up to 3)
export const projectKeyMetrics = sqliteTable('project_key_metrics', {
    id: text('id').primaryKey(),
    projectId: text('project_id')
        .notNull()
        .references(() => projects.id, { onDelete: 'cascade' }),
    value: text('value').notNull(), //[cite: 1]
    description: text('description').notNull(), //[cite: 1]
    order: integer('order').notNull().default(0),
});

// Sec 06: Before / After Comparisons
export const projectComparisons = sqliteTable('project_comparisons', {
    id: text('id').primaryKey(),
    projectId: text('project_id')
        .notNull()
        .references(() => projects.id, { onDelete: 'cascade' }),
    featureName: text('feature_name').notNull(), //[cite: 1]
    beforeFileId: text('before_file_id').references(() => files.id), //[cite: 1]
    afterFileId: text('after_file_id').references(() => files.id), //[cite: 1]
    beforeText: text('before_text'), //[cite: 1]
    afterText: text('after_text'), //[cite: 1]
    order: integer('order').notNull().default(0),
});

// Sec 08: Client & Team Reviews
export const projectReviews = sqliteTable('project_reviews', {
    id: text('id').primaryKey(),
    projectId: text('project_id')
        .notNull()
        .references(() => projects.id, { onDelete: 'cascade' }),
    text: text('text').notNull(), //[cite: 1]
    authorName: text('author_name').notNull(), //[cite: 1]
    authorRole: text('author_role'), //[cite: 1]
    avatarFileId: text('avatar_file_id').references(() => files.id),
    order: integer('order').notNull().default(0),
});

// Sec 07: Before/After Cards (text-only)
export const baCards = sqliteTable('ba_cards', {
    id: text('id').primaryKey(),
    projectId: text('project_id')
        .notNull()
        .references(() => projects.id, { onDelete: 'cascade' }),
    featureName: text('feature_name').notNull(),
    beforeText: text('before_text').notNull(),
    afterText: text('after_text').notNull(),
    order: integer('order').notNull().default(0),
});

// Sec 07 & 08: Dynamic Lists (Results, Tools, Next Steps)
export const projectItems = sqliteTable('project_items', {
    id: text('id').primaryKey(),
    projectId: text('project_id')
        .notNull()
        .references(() => projects.id, { onDelete: 'cascade' }),
    type: text('type', { enum: ['result', 'tool', 'next_step'] }).notNull(), //[cite: 1]
    content: text('content').notNull(), //[cite: 1]
    order: integer('order').notNull().default(0),
});
