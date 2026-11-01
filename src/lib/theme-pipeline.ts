/**
 * Пайплайн сборки темы для UI: seeds → primitives → modes → аудит.
 *
 * Движок не знает о React — этот модуль лишь связывает его вызовы в
 * одну функцию, которую использует и приложение (этап 9), и
 * генератор CSS-артефактов (`scripts/gen-theme-css.ts`).
 *
 * @see src/engine/theme-builder.ts — buildModes
 * @see src/engine/audit/audit.ts — buildAuditReport
 */

import { ENGINE_VERSION, buildAuditReport, METHODOLOGY_VERSION } from '../engine/audit/audit';
import { flattenModes } from '../engine/export/tailwind';
import { getPolicy, type PolicyId } from '../engine/policy/policy';
import { REQUIRED_PAIRS } from '../engine/policy/registry';
import {
    generateNeutralScale,
    generateScale,
    generateStatusScale,
} from '../engine/scale/scale-engine';
import { buildModes } from '../engine/theme-builder';
import { generateHarmonySeeds, type HarmonySchemeId } from '../engine/seeds/schemes';
import type { SolveResult } from '../engine/solver/solver';
import type { ChromaTheme, Primitives, Seeds } from '../model/theme';

// ---------------------------------------------------------------------------
// Дефолты демо-темы
// ---------------------------------------------------------------------------

/** Primary-сид демо-темы: бирюзовый якорь info — читается на светлом и тёмном. */
export const DEFAULT_PRIMARY = '#00543b';

/** Схема гармонии демо-темы. */
export const DEFAULT_SCHEME: HarmonySchemeId = 'triad';

/** Политика демо-темы: госуровень AA. */
export const DEFAULT_POLICY: PolicyId = 'gov-aa';

/**
 * Сиды демо-темы: primary задаёт пользователь, статусы — из якорей
 * движка (зашиты в `generateHarmonySeeds`).
 */
export function defaultSeeds(): Seeds {
    return generateHarmonySeeds(DEFAULT_PRIMARY, DEFAULT_SCHEME);
}

// ---------------------------------------------------------------------------
// Сборка темы
// ---------------------------------------------------------------------------

/** Строит примитивные шкалы из сидов. */
export function buildPrimitives(seeds: Seeds): Primitives {
    return {
        primary: generateScale(seeds.primary),
        secondary: generateScale(seeds.secondary),
        tertiary: generateScale(seeds.tertiary),
        neutral: generateNeutralScale(seeds.neutral),
        success: generateStatusScale(seeds.success),
        warning: generateStatusScale(seeds.warning),
        error: generateStatusScale(seeds.error),
        info: generateStatusScale(seeds.info),
    };
}

/** Результат сборки: тема плюс данные солвера для расшифровок. */
export type ThemeBundle = {
    readonly theme: ChromaTheme;
    /** Решения солвера по парам и режимам — для пояснений «почему». */
    readonly solveResults: Readonly<Record<string, readonly SolveResult[]>>;
    /** Предупреждения раскладки (пары без решения). */
    readonly solveWarnings: readonly string[];
};

/**
 * Собирает полную тему: шкалы, раскладка 8 режимов, аудит, паспорт.
 *
 * @param name     имя темы (попадает в meta и заголовки экспорта)
 * @param seeds    сид-цвета
 * @param policyId идентификатор политики
 */
export function buildThemeBundle(
    name: string,
    seeds: Seeds,
    policyId: PolicyId,
): ThemeBundle {
    const primitives = buildPrimitives(seeds);
    const policy = getPolicy(policyId);
    const { modes, warnings, resultsByMode } = buildModes(
        seeds,
        primitives,
        policy,
    );

    // Аудит считает по разрешённым значениям токенов (HEX с запечённой
    // альфой) — ровно то, что попадает в tokens.css.
    const flat = flattenModes({ modes, primitives });
    const audit = buildAuditReport(REQUIRED_PAIRS, flat, policy);

    const theme: ChromaTheme = {
        meta: {
            name,
            policy: policyId,
            engine: 'oklch-custom-v1',
            engineVersion: ENGINE_VERSION,
            methodologyVersion: METHODOLOGY_VERSION,
            createdAt: new Date().toISOString(),
        },
        seeds,
        primitives,
        modes,
        effects: {},
        audit,
    };

    // Ключ расшифровки: «пара|режим».
    const solveResults: Record<string, SolveResult[]> = {};
    for (const [mode, results] of Object.entries(resultsByMode)) {
        for (const result of results) {
            (solveResults[result.pair] ??= []).push(result);
            solveResults[`${result.pair}|${mode}`] = [result];
        }
    }

    return { theme, solveResults, solveWarnings: warnings };
}
