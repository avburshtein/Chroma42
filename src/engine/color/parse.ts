/**
 * Парсер и форматтер цветовых значений токенов.
 *
 * Поддерживает HEX, `rgb()`, `rgba()` и `oklch()` — тот формат, который
 * используется в экспортируемых CSS-переменных.
 */

import { linearRgbToRgb, oklchToRgb, rgbToOklch, srgbToLinear } from './convert';
import type { Oklch, Rgba } from './types';

/** Разбирает HEX: `#rgb`, `#rgba`, `#rrggbb`, `#rrggbbaa`. */
export function parseHex(input: string): Rgba | null {
    const hex = input.trim().replace(/^#/, '');

    if (!/^[0-9a-fA-F]+$/.test(hex)) return null;

    const expand = (c: string) => parseInt(c + c, 16);

    if (hex.length === 3 || hex.length === 4) {
        return {
            r: expand(hex[0]),
            g: expand(hex[1]),
            b: expand(hex[2]),
            alpha: hex.length === 4 ? expand(hex[3]) / 255 : 1,
        };
    }

    if (hex.length === 6 || hex.length === 8) {
        return {
            r: parseInt(hex.slice(0, 2), 16),
            g: parseInt(hex.slice(2, 4), 16),
            b: parseInt(hex.slice(4, 6), 16),
            alpha: hex.length === 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1,
        };
    }

    return null;
}

/** Разбирает `rgb(r, g, b)` и `rgba(r, g, b, a)`. */
export function parseRgb(input: string): Rgba | null {
    const match = input
        .trim()
        .match(/^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:[\s,/]+([\d.%]+))?\s*\)$/i);

    if (!match) return null;

    const [, r, g, b, a] = match;
    return {
        r: Number(r),
        g: Number(g),
        b: Number(b),
        alpha: a === undefined ? 1 : parseAlpha(a),
    };
}

/** Разбирает `oklch(L C H)` и `oklch(L C H / A)`, конвертируя в sRGB. */
export function parseOklch(input: string): Rgba | null {
    const match = input
        .trim()
        .match(
            /^oklch\(\s*([\d.]+%?)\s+([\d.]+%?)\s+([\d.]+)(?:deg)?(?:\s*\/\s*([\d.]+%?))?\s*\)$/i,
        );

    if (!match) return null;

    const [, lRaw, cRaw, hRaw, aRaw] = match;
    const alpha = aRaw === undefined ? 1 : parseAlpha(aRaw);

    return {
        ...oklchToRgb({
            l: parsePercentOrNumber(lRaw),
            c: parsePercentOrNumber(cRaw),
            h: Number(hRaw),
        }),
        alpha,
    };
}

/** Универсальный парсер: пытается HEX, затем rgb(), затем oklch(). */
export function parseColor(input: string): Rgba | null {
    const value = input.trim();
    if (value.startsWith('#')) return parseHex(value);
    if (/^rgba?\(/i.test(value)) return parseRgb(value);
    if (/^oklch\(/i.test(value)) return parseOklch(value);
    return null;
}

// ---------------------------------------------------------------------------
// Форматирование
// ---------------------------------------------------------------------------

/** Rgba -> `#rrggbb`, либо `#rrggbbaa` при alpha < 1. */
export function formatHex({ r, g, b, alpha }: Rgba): string {
    const hex = (n: number) =>
        Math.round(Math.min(255, Math.max(0, n)))
            .toString(16)
            .padStart(2, '0');

    const base = `#${hex(r)}${hex(g)}${hex(b)}`;
    return alpha < 1 ? `${base}${hex(alpha * 255)}` : base;
}

/** Rgba -> `rgb(r, g, b)` или `rgba(r, g, b, a)`. */
export function formatRgb({ r, g, b, alpha }: Rgba): string {
    const ch = `${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}`;
    return alpha < 1 ? `rgba(${ch}, ${round(alpha, 3)})` : `rgb(${ch})`;
}

/** Oklch -> строка `oklch(58% 0.21 29)`, сохраняя исходную точность. */
export function formatOklch({ l, c, h }: Oklch, alpha = 1): string {
    const base = `oklch(${round(l * 100, 1)}% ${round(c, 4)} ${round(h, 2)})`;
    return alpha < 1 ? `${base} / ${round(alpha, 3)}` : base;
}

/** Форматирует цвет в канонический HEX — используется в паспорте темы. */
export function toCanonicalHex(color: Rgba): string {
    return formatHex(color);
}

/** Относительная яркость по каналу sRGB — вспомогательное для отладки. */
export function channelLuminance(channel: number): number {
    return srgbToLinear(channel / 255);
}

/** Приводит произвольный цвет к OKLCH для дальнейшей работы движков. */
export function toOklch(color: Rgba): Oklch {
    return rgbToOklch(color);
}

/** Приводит OKLCH к sRGB с вписыванием в gamut. */
export function oklchToRgbChannels(oklch: Oklch): Rgba {
    return { ...oklchToRgb(oklch), alpha: 1 };
}

/** Линейный sRGB -> sRGB каналы [0..255]. */
export function toRgbChannels(linear: {
    r: number;
    g: number;
    b: number;
}): Rgba {
    return { ...linearRgbToRgb(linear), alpha: 1 };
}

// ---------------------------------------------------------------------------
// Вспомогательное
// ---------------------------------------------------------------------------

function parseAlpha(raw: string): number {
    if (raw.endsWith('%')) return Number(raw.slice(0, -1)) / 100;
    return Number(raw);
}

/** Число → процент [0..1] с учётом знака процента. */
function parsePercentOrNumber(raw: string): number {
    return raw.endsWith('%') ? Number(raw.slice(0, -1)) / 100 : Number(raw);
}

function round(value: number, digits: number): number {
    const f = 10 ** digits;
    return Math.round(value * f) / f;
}
