import {
    sqliteTable,
    text,
    integer,
    primaryKey,
    uniqueIndex,
    index,
} from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { profiles } from './profiles';
import { files } from './files';
import { categories } from './categories';

// Вариант лейаута финальной галереи кейса — projects.galleryLayout
// (решения (51)-(52) 2026-09-14 в Main_page_Spec.md)
export type GalleryLayout = 'editorial' | 'masonry' | 'justified';

export const projects = sqliteTable(
    'projects',
    {
        id: text('id').primaryKey(),
        profileId: text('profile_id')
            .notNull()
            .references(() => profiles.id, { onDelete: 'cascade' }),

        // Section 00: Slug & Base Meta
        slug: text('slug').notNull(), // /u/[user-slug]/[project-slug][cite: 1]
        title: text('title').notNull(), //[cite: 1]
        teaser: text('teaser'), //[cite: 1]
        client: text('client'), //[cite: 1]
        year: integer('year'), //[cite: 1]
        duration: text('duration'), //[cite: 1]
        myRole: text('my_role'), //[cite: 1]
        constraints: text('constraints'), //[cite: 1]
        devices: text('devices'), //[cite: 1]
        tags: text('tags'), // comma-separated strings[cite: 1]
        coverFileId: text('cover_file_id').references(() => files.id), // Hero image[cite: 1]
        figmaPrototypeUrl: text('figma_prototype_url'), //[cite: 1]
        webPrototypeUrl: text('web_prototype_url'), //[cite: 1]

        // Section 02: Problem & Audience
        galleryDescription: text('gallery_description'), //[cite: 1]
        problemStatement: text('problem_statement'), //[cite: 1]
        projectGoal: text('project_goal'), //[cite: 1]
        targetUsers: text('target_users'), //[cite: 1]

        // Section 03: Research
        researchMethodology: text('research_methodology'), //[cite: 1]
        userStory: text('user_story'), //[cite: 1]

        // Section 04: Design System
        visualDirection: text('visual_direction'), //[cite: 1]
        displayFont: text('display_font'), //[cite: 1]
        bodyFont: text('body_font'), //[cite: 1]
        moodboardPresetId: text('moodboard_preset_id'), // WYSIWYG grid preset

        // Section 05: Process
        designApproach: text('design_approach'), //[cite: 1]

        // Section 06: Testing
        testingProcess: text('testing_process'), //[cite: 1]

        // Section 07: Showcase
        finalDescription: text('final_description'), //[cite: 1]

        // Вариант представления финальной галереи: editorial — сетка
        // «длинное + квадрат + плоское» с кропом в слоты (ShowcaseGallery);
        // masonry — Pinterest-колонки (оригинальные кадры); stack —
        // по одному в ряд (оригинальные кадры). Nullable: отсутствие
        // значения = editorial (совместимо с существующими проектами).
        galleryLayout: text('gallery_layout').$type<GalleryLayout>(),

        // Section 08: Reflections
        keyTakeaway: text('key_takeaway'), //[cite: 1]

        // Видимость секций на публичной странице кейса (JSON-карта sectionKey →
        // boolean; отсутствующий ключ = секция видна при наличии данных)
        sectionsVisibility: text('sections_visibility', {
            mode: 'json',
        }).$type<Partial<Record<string, boolean>>>(),

        // Statuses & Visibility
        status: text('status', { enum: ['draft', 'published', 'archived'] })
            .notNull()
            .default('draft'), //[cite: 1]
        showOnHomepage: integer('show_on_homepage').notNull().default(1),

        // Ручной порядок кейса в галерее дизайнера (Manual-режим сортировки,
        // решения 2026-09-16). Меньше значение = выше в списке; авто-режимы
        // (newest/oldest/A-Z) поле игнорируют. Backfill в миграции — по
        // дате публикации (новейший = 0).
        sortOrder: integer('sort_order').notNull().default(0),

        viewsCount: integer('views_count').notNull().default(0),

        publishedAt: integer('published_at'),
        createdAt: integer('created_at')
            .notNull()
            .default(sql`(unixepoch())`),
        updatedAt: integer('updated_at')
            .notNull()
            .default(sql`(unixepoch())`),
    },
    (t) => ({
        unqProfileSlug: uniqueIndex('idx_projects_profile_slug').on(
            t.profileId,
            t.slug,
        ),
        homeIdx: index('idx_projects_home').on(
            t.status,
            t.showOnHomepage,
            t.createdAt,
        ),
    }),
);

export const projectCategories = sqliteTable(
    'project_categories',
    {
        projectId: text('project_id')
            .notNull()
            .references(() => projects.id, { onDelete: 'cascade' }),
        categoryId: text('category_id')
            .notNull()
            .references(() => categories.id, { onDelete: 'cascade' }),
    },
    (t) => ({
        pk: primaryKey({ columns: [t.projectId, t.categoryId] }),
    }),
);

export const projectAssets = sqliteTable('project_assets', {
    id: text('id').primaryKey(),
    projectId: text('project_id')
        .notNull()
        .references(() => projects.id, { onDelete: 'cascade' }),
    fileId: text('file_id')
        .notNull()
        .references(() => files.id, { onDelete: 'cascade' }),
    assetType: text('asset_type', {
        enum: ['moodboard', 'wireframe', 'final_gallery'],
    }).notNull(), //[cite: 1]
    caption: text('caption'),
    order: integer('order').notNull().default(0),
});
