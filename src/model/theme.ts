/**
 * Внутренняя модель темы Chroma42.
 *
 * Тема хранится как единый объект и затем «плющится» в CSS/JSON при
 * экспорте. Слои: seeds -> primitives -> semantics -> modes -> effects -> audit.
 *
 * @see Docs/Общая архитектура Chroma42.md — раздел 8
 * @see Docs/roadmap — Этап 0, шаг 3
 */

import type { PolicyId, ThemeMode } from '../engine/policy/policy';
import type { ToneScale } from '../engine/scale/scale-engine';
import type { ConfidenceLevel, PairImportance } from '../engine/policy/pair-registry';

/** Сид-цвета, из которых строятся примитивы. */
export type Seeds = {
    readonly primary: string;
    readonly secondary: string;
    readonly tertiary: string;
    readonly neutral: string;
    readonly success: string;
    readonly warning: string;
    readonly error: string;
    readonly info: string;
};

/** Имена примитивных шкал. */
export type PrimitiveName =
    | 'primary'
    | 'secondary'
    | 'tertiary'
    | 'neutral'
    | 'success'
    | 'warning'
    | 'error'
    | 'info';

/** Сырые тональные ряды до распределения по семантическим ролям. */
export type Primitives = Record<PrimitiveName, ToneScale>;

/** Разрешение семантического токена. */
export type SemanticValue = {
    /** Ссылка на примитив: `{neutral.10}`. */
    readonly value: string;
    /** Альфа-канал, 0..1. */
    readonly alpha: number;
    /** Непрозрачный фолбэк для режима сниженной прозрачности. */
    readonly fallback?: string;
    /** Обязательная подложка для прозрачных токенов. */
    readonly requiresBackdrop?: string;
    /** Значение размытия для стеклянных эффектов. */
    readonly blur?: string;
};

/** Раскладка семантических токенов для одного режима. */
export type Semantics = Record<string, SemanticValue>;

/** Все режимы темы с их раскладками. */
export type Modes = Record<ThemeMode, Semantics>;

/** Эффект темы (стекло, тень, оверлей). */
export type Effect = {
    readonly type: 'composite' | 'shadow' | 'solid';
    readonly color: string;
    readonly blur?: string;
    readonly fallback: string;
    readonly a11y?: {
        readonly requiresBackdrop: string;
        readonly reducedTransparencyOverride: string;
    };
};

/** Метаданные темы. */
export type ThemeMeta = {
    readonly name: string;
    readonly policy: PolicyId;
    readonly engine: 'oklch-custom-v1';
    readonly engineVersion: string;
    readonly methodologyVersion: string;
    readonly createdAt: string;
};

/**
 * Полная тема Chroma42.
 *
 * @example
 * const theme: ChromaTheme = { meta, seeds, primitives, modes, effects, audit };
 */
export type ChromaTheme = {
    readonly meta: ThemeMeta;
    readonly seeds: Seeds;
    readonly primitives: Primitives;
    readonly modes: Modes;
    readonly effects: Record<string, Effect>;
    readonly audit: AuditReport;
};

/** Статус одной проверки в паспорте. */
export type CheckStatus = 'pass' | 'warning' | 'fail';

/** Результат проверки одной пары в одном режиме. */
export type AuditCheck = {
    readonly pair: string;
    readonly mode: ThemeMode;
    readonly foregroundValue: string;
    readonly backgroundValue: string;
    readonly context: string;
    readonly requiredRatio: number;
    readonly actualRatio: number;
    readonly status: CheckStatus;
    readonly importance: PairImportance;
    readonly confidence: ConfidenceLevel;
    /** APCA Lc — дополнительный показатель, не нормативный. */
    readonly apcaLc?: number;
    readonly notes?: string;
};

/** Сводка аудита. */
export type AuditSummary = {
    readonly totalPairsChecked: number;
    readonly passed: number;
    readonly warnings: number;
    readonly failed: number;
    readonly exportAllowed: boolean;
};

/** Отчёт аудита — «паспорт» темы. */
export type AuditReport = {
    readonly summary: AuditSummary;
    readonly checks: readonly AuditCheck[];
    readonly warnings: readonly string[];
    readonly legalDisclaimer: string;
};
