/**
 * Альфа-композитинг: «запекание» прозрачных цветов.
 *
 * WCAG не умеет проверять `rgba(255,255,255,0.6)` — формула контраста
 * требует непрозрачных цветов. Поэтому прозрачный токен сначала
 * раскладывается на подложку, и уже полученный «эффективный» цвет
 * проверяется как обычный сплошной.
 *
 * @see Docs/Общая архитектура Chroma42.md — раздел 3.1
 * @see Docs/Chroma42 Color Pair Methodology.md — раздел 6
 */

import { getContrastRatio } from './contrast';
import { parseColor } from '../color/parse';
import type { Rgb } from '../color/types';

/** Результат композитинга с сохранением метаданных. */
export type CompositeResult = {
    /** Эффективный непрозрачный цвет после наложения на подложку. */
    readonly color: Rgb;
    /** Какой подложкой он вычислен. */
    readonly backdrop: Rgb;
    /** Была ли альфа < 1 (то есть действительно применился композитинг). */
    readonly flattened: boolean;
};
/**
 * Формула альфа-блендинга из методологии Chroma42.
 *
 * ```
 * R = fg.R * alpha + bg.R * (1 - alpha)
 * ```
 *
 * @param fg     передний план
 * @param bg     подложка
 * @param alpha  непрозрачность переднего плана, 0..1
 *
 * @see Docs/Общая архитектура Chroma42.md — раздел 3.1
 */
export function alphaBlend(fg: Rgb, bg: Rgb, alpha: number): Rgb {
    const a = Math.min(1, Math.max(0, alpha));

    return {
        r: fg.r * a + bg.r * (1 - a),
        g: fg.g * a + bg.g * (1 - a),
        b: fg.b * a + bg.b * (1 - a),
    };
}

/**
 * Вычисляет эффективный цвет прозрачного токена на указанной подложке.
 *
 * Если токен непрозрачный, подложка игнорируется — результат равен самому
 * цвету токена. Это делает функцию безопасной для сплошных токенов.
 *
 * @param token    прозрачный токен: `#rrggbbaa`, `rgba()`, `oklch(... / a)`
 * @param backdrop обязательная подложка (обязательна для alpha < 1)
 *
 * @example
 * composite('#ffffff80', '#000000').color; // ≈ { r: 128, g: 128, b: 128 }
 *
 * @see Docs/Chroma42 Color Pair Methodology.md — раздел 10.2
 */
export function composite(
    token: string,
    backdrop: string,
): CompositeResult {
    const fg = requireRgb(token, true);
    const bg = requireRgb(backdrop);

    if (fg.alpha >= 1) {
        return { color: { r: fg.r, g: fg.g, b: fg.b }, backdrop: bg, flattened: false };
    }

    return {
        color: alphaBlend(fg, bg, fg.alpha),
        backdrop: bg,
        flattened: true,
    };
}

/**
 * Проверяет худший случай для градиента.
 *
 * Градиенты опасны: на одном стопе текст может быть контрастным, на
 * другом — нет. Инструмент проверяет оба крайних стопа и берёт худший
 * результат, а не «средний».
 *
 * @param stops  HEX-значения стопов градиента
 * @returns худший коэффициент контраста и стоп, на котором он достигнут
 *
 * @see Docs/roadmap — Этап 2, шаг 6 «Проверка градиентов»
 */
export function checkGradientWorstCase(
    text: string,
    stops: readonly string[],
): { ratio: number; worstStop: string; bestStop: string } {
    if (stops.length === 0) {
        throw new Error('Chroma42: градиент должен содержать хотя бы один стоп.');
    }

    let worst = { ratio: Number.POSITIVE_INFINITY, stop: stops[0] };
    let best = { ratio: -1, stop: stops[0] };

    for (const stop of stops) {
        const ratio = getContrastRatio(text, stop);

        if (ratio < worst.ratio) worst = { ratio, stop };
        if (ratio > best.ratio) best = { ratio, stop };
    }

    return { ratio: worst.ratio, worstStop: worst.stop, bestStop: best.stop };
}

// ---------------------------------------------------------------------------
// Вспомогательное
// ---------------------------------------------------------------------------

function requireRgb(value: string, withAlpha = false): { r: number; g: number; b: number; alpha: number } {
    const parsed = parseColor(value);
    if (!parsed) {
        throw new Error(`Chroma42: не удалось разобрать цвет "${value}".`);
    }

    if (withAlpha && parsed.alpha < 1) {
        // Значение разобрано, альфа сохраняется для композитинга.
        return parsed;
    }

    return parsed;
}
