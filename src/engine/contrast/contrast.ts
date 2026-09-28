/**
 * Движок 2: контраст и композитинг.
 *
 * Реализовано с нуля:
 *   - относительная яркость по формуле WCAG 2.2;
 *   - коэффициент контраста;
 *   - APCA (Lc) как дополнительный аналитический показатель;
 *   - альфа-блендинг для «запекания» прозрачных токенов.
 *
 * @see Docs/Общая архитектура Chroma42.md — раздел 3
 * @see Docs/Chroma42 Color Pair Methodology.md — раздел 2.4, 2.7, 6
 */

import { rgbToLinearRgb } from '../color/convert';
import { parseColor } from '../color/parse';
import type { Rgb } from '../color/types';

/** Контекст использования пары — определяет требуемый порог. */
export type PairContext =
    /** Обычный текст (< 18pt / < 14pt bold). */
    | 'text-normal'
    /** Крупный текст (>= 18pt / >= 14pt bold). */
    | 'text-large'
    /** Значимые элементы интерфейса, границы, иконки. */
    | 'ui-component'
    /** Индикатор фокуса. */
    | 'focus-indicator'
    /** Иконка, несущая смысл. */
    | 'icon';

/** Уровень соответствия WCAG. */
export type WcagLevel = 'AA' | 'AAA';

/**
 * Пороги контраста по контексту и уровню WCAG 2.2.
 *
 * @see Docs/Chroma42 Color Pair Methodology.md — таблица в разделе 2.1
 */
export const WCAG_THRESHOLDS: Record<PairContext, Record<WcagLevel, number>> = {
    'text-normal': { AA: 4.5, AAA: 7 },
    'text-large': { AA: 3, AAA: 4.5 },
    'ui-component': { AA: 3, AAA: 4.5 },
    'focus-indicator': { AA: 3, AAA: 4.5 },
    icon: { AA: 3, AAA: 4.5 },
};

// ---------------------------------------------------------------------------
// WCAG 2.2
// ---------------------------------------------------------------------------

/**
 * Относительная яркость по формуле WCAG 2.2.
 *
 * 1. sRGB -> линейный RGB (снятие гамма-коррекции);
 * 2. L = 0.2126·R + 0.7152·G + 0.0722·B;
 * 3. L уже лежит в диапазоне [0..1].
 *
 * Эталон: чёрный = 0, белый = 1.
 */
export function relativeLuminance(color: Rgb | string): number {
    const rgb = typeof color === 'string' ? requireRgb(color) : color;
    const { r, g, b } = rgbToLinearRgb(rgb);

    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Коэффициент контраста двух цветов по формуле WCAG 2.2.
 *
 * `Ratio = (L1 + 0.05) / (L2 + 0.05)`, где L1 — более светлый цвет.
 * Диапазон: 1..21.
 *
 * @example
 * getContrastRatio('#000000', '#ffffff'); // 21
 * getContrastRatio('#767676', '#ffffff'); // ≈ 4.54
 *
 * @see Docs/Chroma42 Color Pair Methodology.md — раздел 10.1
 */
export function getContrastRatio(
    foreground: Rgb | string,
    background: Rgb | string,
): number {
    const l1 = relativeLuminance(foreground);
    const l2 = relativeLuminance(background);

    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);

    return (lighter + 0.05) / (darker + 0.05);
}

/** Проходит ли пара порог для заданного контекста и уровня. */
export function meetsThreshold(
    ratio: number,
    context: PairContext,
    level: WcagLevel,
): boolean {
    // Небольшой допуск: округление до 2 знаков не должно ронять пару.
    return ratio >= WCAG_THRESHOLDS[context][level] - 1e-9;
}

// ---------------------------------------------------------------------------
// APCA (дополнительный показатель, не норматив)
// ---------------------------------------------------------------------------

// Порог «чёрной точки» и показатель сжатия для near-black цветов.
const APCA_BLK_THRS = 0.022;
const APCA_BLK_CLMP = 1.414;

/** Ниже этого порога разница полярностей не считается значимой. */
const APCA_DELTA_Y_MIN = 0.0005;

/**
 * APCA Lightness Contrast (Lc) — дополнительный аналитический показатель.
 *
 * APCA использует другие коэффициенты и учитывает полярность (тёмный текст
 * на светлом фоне и наоборот считаются по-разному). Реализовано по
 * открытой спецификации APCA W3 0.1.9.
 *
 * ВАЖНО: APCA не является нормативным критерием и не заменяет проверку по
 * WCAG 2.2. Используется только как аналитика.
 *
 * Верифицировано по эталонным значениям спецификации:
 *   чёрный на белом  =  106.04
 *   белый на чёрном  = -107.88
 *   #888888 на белом =   63.06
 *
 * @returns Lc в диапазоне примерно -108..+106
 *
 * @see Docs/Chroma42 Color Pair Methodology.md — раздел 2.7
 */
export function apcaLc(text: Rgb | string, background: Rgb | string): number {
    const txtY = apcaY(typeof text === 'string' ? requireRgb(text) : text);
    const bgY = apcaY(
        typeof background === 'string' ? requireRgb(background) : background,
    );

    // Разница полярностей слишком мала — контраст не воспринимается.
    if (Math.abs(bgY - txtY) < APCA_DELTA_Y_MIN) {
        return 0;
    }

    // Нормальная полярность: тёмный текст на светлом фоне.
    if (bgY > txtY) {
        const sapc = (Math.pow(bgY, 0.56) - Math.pow(txtY, 0.57)) * 1.14;
        return sapc < 0.1 ? 0 : round((sapc - 0.027) * 100, 2);
    }

    // Обратная полярность: светлый текст на тёмном фоне.
    const sapc = (Math.pow(bgY, 0.65) - Math.pow(txtY, 0.62)) * 1.14;
    return sapc > -0.1 ? 0 : round((sapc + 0.027) * 100, 2);
}

/** Абсолютное значение Lc — удобно для сравнения «силы» контраста. */
export function apcaAbsLc(text: Rgb | string, background: Rgb | string): number {
    return Math.abs(apcaLc(text, background));
}

/**
 * Относительная яркость по модели APCA.
 *
 * Отличие от WCAG: используется простое возведение в 2.4 без кусочной
 * гаммы sRGB, плюс мягкое сжатие near-black значений — иначе APCA
 * систематически переоценивал бы контраст очень тёмного текста.
 */
function apcaY({ r, g, b }: Rgb): number {
    const sR = Math.pow(r / 255, 2.4);
    const sG = Math.pow(g / 255, 2.4);
    const sB = Math.pow(b / 255, 2.4);

    const y = 0.2126729 * sR + 0.7151522 * sG + 0.072175 * sB;

    return y < APCA_BLK_THRS ? y + Math.pow(APCA_BLK_THRS - y, APCA_BLK_CLMP) : y;
}

function round(value: number, digits: number): number {
    const f = 10 ** digits;
    return Math.round(value * f) / f;
}

// ---------------------------------------------------------------------------
// Вспомогательное
// ---------------------------------------------------------------------------

/** Разбирает строку в Rgb, бросая понятную ошибку при неудаче. */
function requireRgb(value: string): Rgb {
    const parsed = parseColor(value);
    if (!parsed) {
        throw new Error(`Chroma42: не удалось разобрать цвет "${value}".`);
    }
    return { r: parsed.r, g: parsed.g, b: parsed.b };
}
