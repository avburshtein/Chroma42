/**
 * Движок 0: конвертация цветовых пространств.
 *
 * Реализовано с нуля по спецификации W3C CSS Color 4 (матрицы 3x3),
 * без сторонних зависимостей.
 *
 *   HEX -> sRGB(гамма) -> Linear sRGB -> OKLab -> OKLCH
 *   и обратно, с безопасным вписыванием в gamut sRGB.
 *
 * @see Docs/Общая архитектура Chroma42.md — раздел 2, шаг 1 «Конвертация»
 */

import type { LinearRgb, Oklab, Oklch, Rgb } from './types';

/** Хроматичность, выше которой цвет заведомо вне gamut sRGB. */
const MAX_CHROMA_SRGB = 0.4;

/** Допуск для операций с плавающей точкой. */
const EPSILON = 1e-6;

/** Ограничивает значение диапазоном [min..max]. */
export function clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
}

// ---------------------------------------------------------------------------
// Гамма-коррекция sRGB
// ---------------------------------------------------------------------------

/**
 * sRGB (0..1) -> линейный sRGB.
 *
 * Формула из спецификации WCAG: каналы ниже 0.04045 отображаются
 * линейно, остальные проходят степенную кривую с показателем 2.4.
 */
export function srgbToLinear(channel: number): number {
    return channel <= 0.04045
        ? channel / 12.92
        : Math.pow((channel + 0.055) / 1.055, 2.4);
}

/** Линейный sRGB -> sRGB (0..1), обратная гамма-коррекция. */
export function linearToSrgb(channel: number): number {
    return channel <= 0.0031308
        ? channel * 12.92
        : 1.055 * Math.pow(channel, 1 / 2.4) - 0.055;
}

/** Rgb (0..255) -> LinearRgb (0..1). */
export function rgbToLinearRgb({ r, g, b }: Rgb): LinearRgb {
    return {
        r: srgbToLinear(r / 255),
        g: srgbToLinear(g / 255),
        b: srgbToLinear(b / 255),
    };
}

/** LinearRgb (0..1) -> Rgb (0..255) с вписыванием в диапазон. */
export function linearRgbToRgb({ r, g, b }: LinearRgb): Rgb {
    return {
        r: Math.round(clamp(linearToSrgb(r), 0, 1) * 255),
        g: Math.round(clamp(linearToSrgb(g), 0, 1) * 255),
        b: Math.round(clamp(linearToSrgb(b), 0, 1) * 255),
    };
}

// ---------------------------------------------------------------------------
// Линейный sRGB <-> OKLab
// ---------------------------------------------------------------------------

/**
 * Линейный sRGB -> OKLab.
 *
 * Шаг 1: линейный sRGB переводится в LMS перцептивного пространства.
 * Шаг 2: извлекается нелинейный корень (перцептивное сжатие).
 * Шаг 3: взвешенная сумма даёт координаты OKLab.
 *
 * Коэффициенты — из эталонной реализации Björn Ottosson (CSS Color 4).
 */
export function linearRgbToOklab({ r, g, b }: LinearRgb): Oklab {
    const l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b;
    const m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b;
    const s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b;

    const l_ = Math.cbrt(l);
    const m_ = Math.cbrt(m);
    const s_ = Math.cbrt(s);

    return {
        l: 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_,
        a: 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_,
        b: 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_,
    };
}

/** OKLab -> линейный sRGB (может выйти за границы gamut). */
export function oklabToLinearRgb({ l, a, b }: Oklab): LinearRgb {
    const l_ = l + 0.3963377774 * a + 0.2158037573 * b;
    const m_ = l - 0.1055613458 * a - 0.0638541728 * b;
    const s_ = l - 0.0894841775 * a - 1.291485548 * b;

    const L = l_ * l_ * l_;
    const M = m_ * m_ * m_;
    const S = s_ * s_ * s_;

    return {
        r: 4.0767416621 * L - 3.3077115913 * M + 0.2309699292 * S,
        g: -1.2684380046 * L + 2.6097574011 * M - 0.3413193965 * S,
        b: -0.0041960863 * L - 0.7034186147 * M + 1.707614701 * S,
    };
}

// ---------------------------------------------------------------------------
// OKLab <-> OKLCH
// ---------------------------------------------------------------------------

/** OKLab -> OKLCH (полярная система: светлота, радиус, угол). */
export function oklabToOklch({ l, a, b }: Oklab): Oklch {
    const c = Math.sqrt(a * a + b * b);

    // Ахроматические цвета не имеют оттёнка — фиксируем 0,
    // иначе atan2(0, 0) даст нестабильный угол.
    if (c < EPSILON) {
        return { l, c: 0, h: 0 };
    }

    const hDeg = (Math.atan2(b, a) * 180) / Math.PI;
    return { l, c, h: hDeg < 0 ? hDeg + 360 : hDeg };
}

/** OKLCH -> OKLab. */
export function oklchToOklab({ l, c, h }: Oklch): Oklab {
    const hRad = (h * Math.PI) / 180;
    return { l, a: c * Math.cos(hRad), b: c * Math.sin(hRad) };
}

// ---------------------------------------------------------------------------
// Базовые переходы
// ---------------------------------------------------------------------------

/** Rgb (0..255) -> OKLCH. Точка входа для пользовательского сида. */
export function rgbToOklch(rgb: Rgb): Oklch {
    return oklabToOklch(linearRgbToOklab(rgbToLinearRgb(rgb)));
}

/** OKLCH -> Rgb (0..255) с вписыванием в gamut. */
export function oklchToRgb(oklch: Oklch): Rgb {
    return linearRgbToRgb(oklabToLinearRgb(oklchToOklab(oklch)));
}

// ---------------------------------------------------------------------------
// Вписывание в gamut
// ---------------------------------------------------------------------------

/** Проверяет, находится ли линейный цвет в gamut sRGB (с допуском EPSILON). */
export function inSrgbGamut({ r, g, b }: LinearRgb): boolean {
    return (
        r >= -EPSILON &&
        r <= 1 + EPSILON &&
        g >= -EPSILON &&
        g <= 1 + EPSILON &&
        b >= -EPSILON &&
        b <= 1 + EPSILON
    );
}

/**
 * Вписывает OKLCH в gamut sRGB, сохраняя воспринимаемую светлоту.
 *
 * Яркие цвета (особенно синий и жёлтый) в OKLCH часто выходят за пределы
 * sRGB. Наивное обрезание каналов сдвигало бы воспринимаемый оттенок,
 * поэтому используется бисекция по хроматичности: уменьшаем C до
 * максимального допустимого значения при неизменных L и H.
 *
 * @see Docs/Общая архитектура Chroma42.md — раздел 2, шаг 5 «Клиппинг»
 */
export function gamutMapOklch(oklch: Oklch): Oklch {
    const l = clamp(oklch.l, 0, 1);

    // Цвет уже в gamut — возвращаем без изменений.
    if (inSrgbGamut(oklabToLinearRgb(oklchToOklab({ ...oklch, l })))) {
        return { ...oklch, l };
    }

    // Бисекция по хроматичности: ищем максимум C в пределах gamut.
    let low = 0;
    let high = Math.min(oklch.c, MAX_CHROMA_SRGB);
    let best: Oklch = { l, c: 0, h: oklch.h };

    for (let i = 0; i < 24; i++) {
        const mid = (low + high) / 2;
        const candidate: Oklch = { l, c: mid, h: oklch.h };

        if (inSrgbGamut(oklabToLinearRgb(oklchToOklab(candidate)))) {
            best = candidate;
            low = mid;
        } else {
            high = mid;
        }
    }

    return best;
}

/** OKLCH -> Rgb с предварительным вписыванием в gamut. */
export function oklchToRgbSafe(oklch: Oklch): Rgb {
    return oklchToRgb(gamutMapOklch(oklch));
}
