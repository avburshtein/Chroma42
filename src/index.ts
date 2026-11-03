/**
 * Chroma42 — публичная точка входа библиотеки.
 *
 * Пакет собирается из движков (`src/engine`), модели темы (`src/model`)
 * и пайплайна сборки (`src/lib/theme-pipeline`). Ни React, ни Next.js
 * здесь нет — движок пригоден для серверного рендера, воркеров и
 * генерации CSS-артефактов.
 *
 * Пример:
 * ```ts
 * import { buildThemeBundle, defaultSeeds, getPolicy } from 'chroma42';
 *
 * const { theme, report } = buildThemeBundle('Моя тема', defaultSeeds(), 'standard-aa');
 * console.log(report.summary); // { passed, failed, exportAllowed }
 * ```
 *
 * @see Docs/Общая архитектура Chroma42.md
 */

// --- Движки -----------------------------------------------------------------
export * from './engine/index';

// --- Модель темы -----------------------------------------------------------
export type {
    AuditCheck,
    AuditReport,
    AuditSummary,
    CheckStatus,
    ChromaTheme,
    Effect,
    Modes,
    Primitives,
    PrimitiveName,
    Seeds,
    SemanticValue,
    Semantics,
    ThemeMeta,
} from './model/theme';

// --- Пайплайн сборки темы (seeds → primitives → modes → аудит) ------------
export {
    buildPrimitives,
    buildThemeBundle,
    DEFAULT_POLICY,
    DEFAULT_PRIMARY,
    DEFAULT_SCHEME,
    defaultSeeds,
    type ThemeBundle,
} from './lib/theme-pipeline';
