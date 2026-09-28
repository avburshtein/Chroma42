import {
    sqliteTable,
    text,
    real,
    integer,
    uniqueIndex,
} from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { projects } from './projects';

export const colorRoles = sqliteTable(
    'color_roles',
    {
        id: text('id').primaryKey(),
        projectId: text('project_id')
            .notNull()
            .references(() => projects.id, { onDelete: 'cascade' }),
        name1: text('name1').notNull(),
        name2: text('name2').notNull(),

        lightColor1: text('light_color1').notNull(),
        lightColor2: text('light_color2').notNull(),
        darkColor1: text('dark_color1').notNull(),
        darkColor2: text('dark_color2').notNull(),

        lightContrastRatio: real('light_contrast_ratio'),
        darkContrastRatio: real('dark_contrast_ratio'),

        order: integer('order').notNull().default(0),
        createdAt: integer('created_at')
            .notNull()
            .default(sql`(unixepoch())`),
    },
    (t) => ({
        unqProjectName2: uniqueIndex('idx_color_roles_project_name2').on(
            t.projectId,
            t.name2,
        ),
    }),
);
