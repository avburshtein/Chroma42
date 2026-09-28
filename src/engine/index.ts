/**
 * Chroma42 — публичный API движков.
 *
 * Движки изолированы: Scale Engine, Composite Engine, Contrast Engine,
 * Policy & Solver, Audit & Passport. Они не знают друг о друге напрямую
 * и общаются через строгие TypeScript-типы из `model/theme`.
 *
 * @see Docs/Общая архитектура Chroma42.md — раздел 1
 */

// --- Движок 0: конвертация цветов ----------------------------------------
export type {
    LinearRgb,
    Oklab,
    Oklch,
    PrimitiveRef,
    Rgb,
    Rgba,
    SemanticRef,
} from './color/types';

export {
    clamp,
    gamutMapOklch,
    inSrgbGamut,
    linearRgbToOklab,
    linearRgbToRgb,
    linearToSrgb,
    oklabToLinearRgb,
    oklabToOklch,
    oklchToOklab,
    oklchToRgb,
    oklchToRgbSafe,
    rgbToLinearRgb,
    rgbToOklch,
    srgbToLinear,
} from './color/convert';

export {
    formatHex,
    formatOklch,
    formatRgb,
    parseColor,
    parseHex,
    parseOklch,
    parseRgb,
} from './color/parse';

// --- Движок 1: генератор шкал --------------------------------------------
export type { ScaleOptions, Tone, ToneScale } from './scale/scale-engine';

export {
    DEFAULT_TONES,
    chromaCurve,
    generateNeutralScale,
    generateScale,
    generateStatusScale,
    hueShift,
    isMonotonic,
    lightnessCurve,
    normalizeHue,
} from './scale/scale-engine';

// --- Движок 2: контраст и композитинг ------------------------------------
export type { PairContext, WcagLevel } from './contrast/contrast';

export {
    WCAG_THRESHOLDS,
    apcaAbsLc,
    apcaLc,
    getContrastRatio,
    meetsThreshold,
    relativeLuminance,
} from './contrast/contrast';

export type { CompositeResult } from './contrast/composite';

export { alphaBlend, checkGradientWorstCase, composite } from './contrast/composite';

// --- Движок 3: политики и солвер ----------------------------------------
export type {
    ConfidenceLevel,
    PairCategory,
    PairDefinition,
    PairImportance,
    PairThreshold,
} from './policy/pair-registry';

export {
    PAIR_REGISTRY,
    REQUIRED_PAIRS,
    STATUS_NAMES,
    findPair,
    pairsByCategory,
} from './policy/registry';

export type { Policy, PolicyId, ResolvedThreshold, ThemeMode } from './policy/policy';

export {
    POLICIES,
    POLICY_IDS,
    POLICY_VERSION,
    THEME_MODES,
    getPolicy,
    modeScheme,
    resolveThreshold,
} from './policy/policy';

export type { SolveResult } from './solver/solver';

export { autoFix, collectWarnings, solvePair, toneSearchOrder } from './solver/solver';

// --- Движок 5: аудит и паспорт -------------------------------------------
export type { PairCheckResult, TokenMap } from './audit/audit';

export {
    ENGINE_VERSION,
    LEGAL_DISCLAIMER,
    METHODOLOGY_VERSION,
    PASSPORT_VERSION,
    buildAuditReport,
    buildMarkdownReport,
    buildPassport,
    checkPair,
} from './audit/audit';

// --- Модель темы ----------------------------------------------------------
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
} from '../model/theme';
