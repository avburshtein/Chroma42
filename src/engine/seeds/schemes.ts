/**
 * Движок 1.5: подбор сидов по цветовым гармониям.
 *
 * Шесть схем работают в OKLCH от primary-сида и генерируют secondary и
 * tertiary поворотом оттёнка с пересчётом хроматичности.
 *
 * Важно: углы (30°/120°/180°/150°/90°) перенесены из HSL-традиции как
 * константы-приближения. В OKLCH «комплементарный» ≠ перцептивный
 * комплемент — углы условны и задокументированы здесь.
 *
 * При повороте оттенка хроматичность пересчитывается коэффициентом,
 * затем ограничивается максимальной доступной хромой в gamut sRGB
 * (максимум сильно различается между оттенками: у жёлтого — ~0.09,
 * у синего — ~0.3), и только потом применяется гамут-клэмп. Иначе сид
 * получается тусклым или выходит за sRGB.
 *
 * @see Docs/roadmap/Роадмап с учётом всех запланированных фич.md — Этап 12.1
 */

import {
    clamp,
    inSrgbGamut,
    oklabToLinearRgb,
    oklchToOklab,
    oklchToRgbSafe,
    rgbToOklch,
} from '../color/convert';
import { formatHex, parseColor } from '../color/parse';
import type { Oklch } from '../color/types';
import { normalizeHue } from '../scale/scale-engine';
import { STATUS_SEED_ANCHORS } from './anchors';
import type { Seeds } from '../../model/theme';

// ---------------------------------------------------------------------------
// Схемы гармоний
// ---------------------------------------------------------------------------

/** Идентификаторы шести гармонических схем. */
export type HarmonySchemeId =
    | 'monochrome'
    | 'analogous'
    | 'complementary'
    | 'split-complementary'
    | 'triad'
    | 'tetrad';

/** Описание гармонической схемы. */
export type HarmonyScheme = {
    readonly id: HarmonySchemeId;
    readonly name: string;
    /** Сдвиги оттёнка для secondary и tertiary, градусы. */
    readonly hueOffsets: readonly [number, number];
    /** Коэффициенты пересчёта хроматичности для secondary и tertiary. */
    readonly chromaFactors: readonly [number, number];
};

/**
 * Реестр схем.
 *
 * - **Монохром** — оттёнок не меняется, хрома понижается коэффициентами:
 *   secondary и tertiary остаются «в одном голосе» с primary.
 * - **Комплементарная** — secondary = +180°, tertiary = приглушённый
 *   primary (0-сдвиг с коэффициентом 0.55): третья позиция играет роль
 *   мягкой поддержки, а не третьего самостоятельного цвета.
 * - **Сплит-комплементарная** — 180° ± 30°: комплементарная пара
 *   разбивается на два родственных оттенка.
 *
 * Углы приближены из HSL-традиции и в OKLCH условны.
 */
export const HARMONY_SCHEMES: Record<HarmonySchemeId, HarmonyScheme> = {
    monochrome: {
        id: 'monochrome',
        name: 'Монохром',
        hueOffsets: [0, 0],
        chromaFactors: [0.65, 0.4],
    },
    analogous: {
        id: 'analogous',
        name: 'Аналоговая',
        hueOffsets: [30, -30],
        chromaFactors: [0.9, 0.9],
    },
    complementary: {
        id: 'complementary',
        name: 'Комплементарная',
        hueOffsets: [180, 0],
        chromaFactors: [0.9, 0.55],
    },
    'split-complementary': {
        id: 'split-complementary',
        name: 'Сплит-комплементарная',
        hueOffsets: [150, -150],
        chromaFactors: [0.9, 0.9],
    },
    triad: {
        id: 'triad',
        name: 'Триада',
        hueOffsets: [120, 240],
        chromaFactors: [0.9, 0.9],
    },
    tetrad: {
        id: 'tetrad',
        name: 'Тетрада',
        hueOffsets: [90, 180],
        chromaFactors: [0.9, 0.9],
    },
};

// ---------------------------------------------------------------------------
// Пересчёт хроматичности
// ---------------------------------------------------------------------------

/** Хроматичность, выше которой цвет заведомо вне gamut sRGB. */
const MAX_CHROMA_SRGB = 0.4;

/** Число итераций бисекции: точность ~0.4 / 2^24 ≈ 2.4e-8. */
const BISECTION_STEPS = 24;

/**
 * Максимальная хроматичность в gamut sRGB для заданных светлоты и оттёнка.
 *
 * Бисекция по хроматичности — тот же подход, что и в `gamutMapOklch`,
 * но возвращает границу, а не вписанный цвет. Максимум доступной хромы
 * сильно различается между оттенками, поэтому при повороте оттёнка
 * коэффициента от хромы сида недостаточно: получившееся значение нужно
 * дополнительно ограничить этой величиной.
 *
 * @param l светлота OKLCH, [0..1]
 * @param h оттёнок, градусы
 */
export function maxChromaInSrgb(l: number, h: number): number {
    let low = 0;
    let high = MAX_CHROMA_SRGB;

    for (let i = 0; i < BISECTION_STEPS; i++) {
        const mid = (low + high) / 2;
        const linear = oklabToLinearRgb(oklchToOklab({ l, c: mid, h }));

        if (inSrgbGamut(linear)) {
            low = mid;
        } else {
            high = mid;
        }
    }

    return low;
}

// ---------------------------------------------------------------------------
// Генерация сидов
// ---------------------------------------------------------------------------

/** Настройки генерации гармонических сидов. */
export type HarmonySeedOptions = {
    /**
     * Запас безопасности хроматичности (0..1]. Доля от максимальной
     * доступной хромы. Небольшой отступ от границы gamut исключает
     * искажение оттёнка при финальном клипе. По умолчанию 0.92.
     */
    readonly chromaSafety?: number;
    /** Переопределение коэффициентов хроматичности схемы. */
    readonly chromaFactors?: readonly [number, number];
};

/** Результат применения схемы: три сидовых цвета в HEX. */
export type HarmonySeeds = {
    readonly primary: string;
    readonly secondary: string;
    readonly tertiary: string;
};

/** Строит сид-цвет поворотом оттёнка с пересчётом хроматичности. */
function deriveSeed(
    base: Oklch,
    hueOffset: number,
    chromaFactor: number,
    safety: number,
): string {
    const h = normalizeHue(base.h + hueOffset);
    const maxC = maxChromaInSrgb(base.l, h);

    // Коэффициент от хромы сида, затем ограничение доступной хромой.
    const c = clamp(base.c * chromaFactor, 0, maxC * safety);

    return formatHex({ ...oklchToRgbSafe({ l: base.l, c, h }), alpha: 1 });
}

/**
 * Применяет гармоническую схему к primary-сиду.
 *
 * @param primary  сид-цвет: `#rrggbb`, `rgb()` или `oklch()`
 * @param schemeId идентификатор схемы из `HARMONY_SCHEMES`
 * @param options  настройки пересчёта хроматичности
 * @returns primary, secondary и tertiary в HEX
 *
 * @throws если primary не удалось разобрать или схема неизвестна
 *
 * @example
 * applyHarmony('#00543b', 'triad');
 */
export function applyHarmony(
    primary: string,
    schemeId: HarmonySchemeId,
    options: HarmonySeedOptions = {},
): HarmonySeeds {
    const parsed = parseColor(primary);
    if (!parsed) {
        throw new Error(
            `Chroma42: не удалось разобрать сид-цвет "${primary}". ` +
                'Ожидается HEX, rgb() или oklch().',
        );
    }

    const scheme = HARMONY_SCHEMES[schemeId];
    if (!scheme) {
        throw new Error(`Chroma42: неизвестная схема гармоний "${schemeId}".`);
    }

    const base = rgbToOklch(parsed);
    const { chromaFactors = scheme.chromaFactors } = options;
    const safety = options.chromaSafety ?? 0.92;

    return {
        primary: formatHex({ ...parsed, alpha: 1 }),
        secondary: deriveSeed(base, scheme.hueOffsets[0], chromaFactors[0], safety),
        tertiary: deriveSeed(base, scheme.hueOffsets[1], chromaFactors[1], safety),
    };
}

/**
 * Полный набор сидов из гармонической схемы.
 *
 * primary/secondary/tertiary берутся из схемы, neutral наследует
 * оттёнок primary (хрома neutral-шкалы почти обнуляется на уровне
 * `generateNeutralScale`), а статусы — константы `STATUS_SEED_ANCHORS`.
 *
 * @example
 * generateHarmonySeeds('#00543b', 'triad');
 */
export function generateHarmonySeeds(
    primary: string,
    schemeId: HarmonySchemeId,
    options: HarmonySeedOptions = {},
): Seeds {
    const harmony = applyHarmony(primary, schemeId, options);

    return {
        primary: harmony.primary,
        secondary: harmony.secondary,
        tertiary: harmony.tertiary,
        neutral: harmony.primary,
        success: STATUS_SEED_ANCHORS.success,
        warning: STATUS_SEED_ANCHORS.warning,
        error: STATUS_SEED_ANCHORS.error,
        info: STATUS_SEED_ANCHORS.info,
    };
}
