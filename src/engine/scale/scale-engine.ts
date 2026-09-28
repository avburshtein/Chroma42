/**
 * Движок 1: генератор тональных рядов (OKLCH Scale Engine).
 *
 * Из одного HEX-сида строится ряд тонов 0..100, которые выглядят
 * естественно и сохраняют характер исходного цвета.
 *
 * Три собственные кривые (никакого HSL, никакого Material HCT):
 *   1. Светлота (L)  — плавная, с уплотнением в свелой зоне.
 *   2. Насыщенность (C) — колоколообразная, спад до нуля на краях.
 *   3. Сдвиг оттёнка (H) — микро-сдвиг к тёплому/холодному.
 *
 * @see Docs/Общая архитектура Chroma42.md — раздел 2
 * @see Docs/roadmap/Роадмап с учётом всех запланированных фич.md — Этап 1
 */

import { oklchToRgbSafe, rgbToOklch } from '../color/convert';
import { formatHex, parseColor } from '../color/parse';
import type { Oklch } from '../color/types';

/** Тональный ряд: тон -> HEX. */
export type ToneScale = Record<number, string>;

/**
 * Стандартный набор тонов.
 *
 * 0 и 100 — абсолютные чёрный и белый. 99 вместо 100 в «мягких» ролях
 * (поверхности) даёт возможность отделить бумажный фон от чистого белого.
 *
 * @see Docs/roadmap — Этап 1, шаг 2
 */
export const DEFAULT_TONES = [
    0, 5, 10, 20, 30, 40, 50, 60, 70, 80, 90, 95, 99, 100,
] as const;

export type Tone = (typeof DEFAULT_TONES)[number];

/** Настройки генератора шкалы. */
export type ScaleOptions = {
    /** Тона для генерации. По умолчанию DEFAULT_TONES. */
    readonly tones?: readonly number[];
    /**
     * Насколько выражен пик насыщенности (0..1).
     * 0 — линейный спад, 1 — максимально «сочный» ряд.
     * По умолчанию 0.85.
     */
    readonly chromaPeak?: number;
    /**
     * Сила сдвига оттёнка в градусах на краях шкалы.
     * По умолчанию 6 градусов.
     */
    readonly hueShift?: number;
    /**
     * Коэффициент подавления насыщенности для ахроматических шкал.
     * neutral-шкалы строятся с почти нулевой хроматичностью.
     * По умолчанию 0.08.
     */
    readonly chromaFactor?: number;
};

// ---------------------------------------------------------------------------
// Кривая светлоты
// ---------------------------------------------------------------------------

/**
 * Светлота для тона 0..100.
 *
 * Интерполяция линейная — как и предписывает спецификация: OKLCH
 * уже является перцептивно равномерным пространством, поэтому
 * «подкрашивать» светлоту не нужно.
 *
 * Почему не S-кривая: применение нелинейных преобразований «для
 * красоты» схлопывает соседние тёмные тона в один цвет (5 и 10 давали
 * одинаковый `#000000`), и шкала перестаёт быть различимой.
 *
 * Практический эффект линейной шкалы для achromatic-цвета:
 *   tone 10 -> ~#090909      tone 50 -> ~#646464
 *   tone 20 -> ~#191919      tone 90 -> ~#dfdfdf
 *   tone 40 -> ~#494949      tone 99 -> ~#fcfcfc (отличим от белого)
 *
 * @returns значение OKLCH в диапазоне [0..1]
 */
export function lightnessCurve(tone: number): number {
    if (tone <= 0) return 0;
    if (tone >= 100) return 1;
    return tone / 100;
}

// ---------------------------------------------------------------------------
// Кривая насыщенности
// ---------------------------------------------------------------------------

/**
 * Насыщенность для тона 0..100.
 *
 * Ключевая идея: чёрный и белый не имеют оттенка, поэтому хроматичность
 * обязана падать до нуля на краях. Пик приходится на тона 40–60.
 *
 * Форма —半 колокол на основе синуса: `sin(pi * t)`, возведённый в степень,
 * что даёт более узкий «горб» и не даёт ряду выглядеть «кислотным».
 *
 * @param tone      тон 0..100
 * @param seedChroma максимальная хроматичность сида
 * @param peak      выраженность пика (0..1)
 */
export function chromaCurve(
    tone: number,
    seedChroma: number,
    peak = 0.85,
): number {
    if (tone <= 0 || tone >= 100) return 0;

    const t = tone / 100;

    // Колокол: максимум на t = 0.5, нули на краях.
    const bell = Math.sin(Math.PI * t);

    // Возведение в степень сужает «горб» вокруг середины.
    const shaped = Math.pow(bell, 1.6 * (1 - peak) + 0.4);

    // Пик смещаем в верхнюю половину: насыщенные тона визуально «тяжелее»,
    // поэтому держим максимум на 50–55, а не ровно на 50.
    const skew = t < 0.5 ? 0.94 : 1.0;

    return seedChroma * shaped * skew;
}

// ---------------------------------------------------------------------------
// Сдвиг оттёнка
// ---------------------------------------------------------------------------

/**
 * Микро-сдвиг оттёнка.
 *
 * Светлые тона уходят в тёплую сторону (к жёлтому, ~80°), тёмные — в
 * холодную (к синему/пурпурному, ~250°). Это делает палитру визуально
 * «дороже» и естественнее, чем механическая симметрия.
 *
 * В середине шкалы оттёнок не трогается: сила сдвига растёт к краям.
 *
 * @param seedHue  базовый оттёнок сида, градусы
 * @param tone     тон 0..100
 * @param maxShift максимальный сдвиг в градусах
 */
export function hueShift(seedHue: number, tone: number, maxShift = 6): number {
    const t = tone / 100;
    const distance = Math.abs(t - 0.5) * 2; // 0 в середине, 1 на краях

    // Тёплый полюс (~80°) для светлых, холодный (~250°) для тёмных.
    const target = t >= 0.5 ? 80 : 250;

    // Смешиваем с базовым оттёнком: чем дальше от середины, тем сильнее
    // уход в полюс, но полный сдвиг никогда не достигается.
    const pull = Math.pow(distance, 3) * (maxShift / 360);

    return normalizeHue(lerpHue(seedHue, target, pull));
}

// ---------------------------------------------------------------------------
// Генерация шкалы
// ---------------------------------------------------------------------------

/**
 * Строит тональный ряд из HEX-сида.
 *
 * @param seed     исходный цвет: `#rrggbb`, `rgb()` или `oklch()`
 * @param options  настройки кривых
 * @returns тон -> HEX
 *
 * @example
 * const primary = generateScale('#00543b');
 * primary[50];
 */
export function generateScale(seed: string, options: ScaleOptions = {}): ToneScale {
    const parsed = parseColor(seed);
    if (!parsed) {
        throw new Error(
            `Chroma42: не удалось разобрать сид-цвет "${seed}". ` +
                'Ожидается HEX, rgb() или oklch().',
        );
    }

    const { tones = DEFAULT_TONES, chromaFactor = 1 } = options;
    const seedOklch = rgbToOklch(parsed);

    return buildScale(seedOklch, seedOklch.c * chromaFactor, options);
}

/**
 * Строит ахроматическую (neutral) шкалу из оттёнка сида.
 *
 * Оттенок сохраняется, хроматичность почти обнуляется — серые поверхности
 * получают лёгкий цветовой подтон вместо мёртвого серого.
 *
 * @see Docs/roadmap — Этап 1, шаг 5
 */
export function generateNeutralScale(
    seed: string,
    options: ScaleOptions = {},
): ToneScale {
    return generateScale(seed, { chromaFactor: 0.08, ...options });
}

/**
 * Строит шкалу статуса с ограничением хроматичности.
 *
 * Статусные цвета не должны «спорить» с основной палитрой, поэтому их
 * насыщенность искусственно ограничена.
 *
 * @see Docs/roadmap — Этап 1, шаг 6
 */
export function generateStatusScale(
    seed: string,
    options: ScaleOptions & { readonly chromaLimit?: number } = {},
): ToneScale {
    const { chromaLimit = 0.16, ...rest } = options;

    const parsed = parseColor(seed);
    if (!parsed) {
        throw new Error(
            `Chroma42: не удалось разобрать сид-цвет "${seed}". ` +
                'Ожидается HEX, rgb() или oklch().',
        );
    }

    const seedOklch = rgbToOklch(parsed);
    return buildScale(seedOklch, Math.min(seedOklch.c, chromaLimit), rest);
}

/** Общий построитель шкалы по OKLCH-сиду с ограниченной хроматичностью. */
function buildScale(
    seed: Oklch,
    maxChroma: number,
    options: ScaleOptions,
): ToneScale {
    const {
        tones = DEFAULT_TONES,
        chromaPeak = 0.85,
        hueShift: hueShiftAmount = 6,
    } = options;

    const scale: ToneScale = {};

    for (const tone of tones) {
        // Абсолютные крайние тона определены самим смыслом шкалы.
        if (tone <= 0) {
            scale[tone] = '#000000';
            continue;
        }
        if (tone >= 100) {
            scale[tone] = '#ffffff';
            continue;
        }

        scale[tone] = formatHex({
            ...oklchToRgbSafe({
                l: lightnessCurve(tone),
                c: chromaCurve(tone, maxChroma, chromaPeak),
                h: hueShift(seed.h, tone, hueShiftAmount),
            }),
            alpha: 1,
        });
    }

    return scale;
}

/**
 * Проверяет монотонность светлоты в шкале.
 *
 * Светлота обязана строго возрастать с ростом тона, иначе ряд визуально
 * «ломается». Используется в тестах генерации.
 *
 * @see Docs/Chroma42 Color Pair Methodology.md — раздел 10.3
 */
export function isMonotonic(scale: ToneScale): boolean {
    const tones = Object.keys(scale)
        .map(Number)
        .sort((a, b) => a - b);

    let previous = -1;

    for (const tone of tones) {
        const color = parseColor(scale[tone]);
        if (!color) return false;

        const l = rgbToOklch(color).l;
        if (l < previous - 1e-6) return false;
        previous = l;
    }

    return true;
}

// ---------------------------------------------------------------------------
// Вспомогательное
// ---------------------------------------------------------------------------

function clamp01(value: number): number {
    return Math.min(1, Math.max(0, value));
}

/** Приводит оттёнок в диапазон [0..360). */
export function normalizeHue(hue: number): number {
    const h = hue % 360;
    return h < 0 ? h + 360 : h;
}

/** Кратчайшая интерполяция между оттёнками через круг. */
function lerpHue(from: number, to: number, t: number): number {
    const delta = ((to - from + 540) % 360) - 180;
    return from + delta * t;
}
