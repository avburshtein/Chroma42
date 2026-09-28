/**
 * Эталонные тесты альфа-композитинга.
 *
 * @see Docs/Chroma42 Color Pair Methodology.md — раздел 10.2
 */

import { describe, expect, it } from 'vitest';
import { alphaBlend, checkGradientWorstCase, composite } from '../src/engine/contrast/composite';
import { getContrastRatio } from '../src/engine/contrast/contrast';
import { parseColor } from '../src/engine/color/parse';

describe('Формула альфа-блендинга', () => {
    it('50% белый поверх чёрного даёт серый', () => {
        const result = alphaBlend(
            { r: 255, g: 255, b: 255 },
            { r: 0, g: 0, b: 0 },
            0.5,
        );
        expect(result).toEqual({ r: 127.5, g: 127.5, b: 127.5 });
    });

    it('50% чёрный поверх белого даёт тот же серый', () => {
        const result = alphaBlend(
            { r: 0, g: 0, b: 0 },
            { r: 255, g: 255, b: 255 },
            0.5,
        );
        expect(result).toEqual({ r: 127.5, g: 127.5, b: 127.5 });
    });

    it('при alpha = 1 возвращает исходный передний план', () => {
        const fg = { r: 18, g: 52, b: 86 };
        expect(alphaBlend(fg, { r: 255, g: 255, b: 255 }, 1)).toEqual(fg);
    });

    it('при alpha = 0 возвращает подложку', () => {
        const bg = { r: 12, g: 34, b: 56 };
        expect(alphaBlend({ r: 255, g: 255, b: 255 }, bg, 0)).toEqual(bg);
    });
});

describe('Запекание прозрачного токена', () => {
    it('композитит #ffffff80 поверх чёрного в серый', () => {
        const { color, flattened } = composite('#ffffff80', '#000000');
        expect(flattened).toBe(true);
        // 255 * 0.5 + 0 * 0.5 = 127.5 -> округление в парсере даёт 128
        expect(Math.round(color.r)).toBe(128);
    });

    it('непрозрачный токен игнорирует подложку', () => {
        const { color, flattened } = composite('#00543b', '#ffffff');
        expect(flattened).toBe(false);
        expect(color).toEqual({ r: 0, g: 84, b: 59 });
    });

    it('вычисленный контраст совпадает с контрастом запечённого цвета', () => {
        const baked = composite('#ffffff80', '#000000').color;
        const direct = getContrastRatio('#ffffff', baked);
        expect(direct).toBeGreaterThan(1);
    });
});

describe('Проверка градиентов', () => {
    it('находит худший стоп, а не усредняет', () => {
        const stops = ['#ffffff', '#000000', '#808080'];
        const result = checkGradientWorstCase('#ffffff', stops);

        // Белый текст: лучший стоп — чёрный, худший — белый (контраст 1:1).
        expect(result.worstStop).toBe('#ffffff');
        expect(result.bestStop).toBe('#000000');
        expect(result.ratio).toBeCloseTo(1, 2);
    });

    it('бросает ошибку на пустом градиенте', () => {
        expect(() => checkGradientWorstCase('#fff', [])).toThrow();
    });
});

describe('Парсер цветов', () => {
    it('разбирает сокращённый HEX', () => {
        expect(parseColor('#0f8')).toEqual({ r: 0, g: 255, b: 136, alpha: 1 });
    });

    it('разбирает полный HEX', () => {
        expect(parseColor('#00543b')).toEqual({ r: 0, g: 84, b: 59, alpha: 1 });
    });

    it('разбирает HEX с альфой', () => {
        expect(parseColor('#00000080')?.alpha).toBeCloseTo(0.502, 2);
    });

    it('разбирает rgb()', () => {
        expect(parseColor('rgb(0, 84, 59)')).toEqual({ r: 0, g: 84, b: 59, alpha: 1 });
    });

    it('разбирает oklch()', () => {
        const parsed = parseColor('oklch(58% 0.13 163)');
        expect(parsed).not.toBeNull();
        // Конвертация в sRGB обязана дать валидные каналы.
        expect(parsed!.r).toBeGreaterThanOrEqual(0);
        expect(parsed!.r).toBeLessThanOrEqual(255);
        expect(parsed!.alpha).toBe(1);
    });

    it('возвращает null на мусоре', () => {
        expect(parseColor('не цвет')).toBeNull();
        expect(parseColor('#ZZZ')).toBeNull();
    });
});
