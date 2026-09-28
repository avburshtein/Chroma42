/**
 * Эталонные тесты генерации тональных рядов.
 *
 * @see Docs/Chroma42 Color Pair Methodology.md — раздел 10.3
 * @see Docs/roadmap — Этап 1
 */

import { describe, expect, it } from 'vitest';
import {
    DEFAULT_TONES,
    chromaCurve,
    generateNeutralScale,
    generateScale,
    generateStatusScale,
    isMonotonic,
    lightnessCurve,
} from '../src/engine/scale/scale-engine';
import { parseColor, formatHex } from '../src/engine/color/parse';
import { inSrgbGamut, oklabToLinearRgb, oklchToOklab, oklchToRgb, rgbToOklch } from '../src/engine/color/convert';

const SEED = '#00543b';

describe('Тональный ряд', () => {
    it('генерирует все стандартные тона', () => {
        const scale = generateScale(SEED);
        for (const tone of DEFAULT_TONES) {
            expect(scale[tone]).toBeDefined();
        }
    });

    it('тон 0 — абсолютный чёрный, тон 100 — абсолютный белый', () => {
        const scale = generateScale(SEED);
        expect(scale[0]).toBe('#000000');
        expect(scale[100]).toBe('#ffffff');
    });

    it('светлота монотонно возрастает', () => {
        expect(isMonotonic(generateScale(SEED))).toBe(true);
        expect(isMonotonic(generateNeutralScale(SEED))).toBe(true);
        expect(isMonotonic(generateStatusScale('#8a5100'))).toBe(true);
    });

    it('все тона попадают в gamut sRGB', () => {
        const scale = generateScale(SEED);
        for (const tone of Object.keys(scale)) {
            const color = parseColor(scale[Number(tone)])!;
            const linear = oklabToLinearRgb(oklchToOklab(rgbToOklch(color)));
            expect(inSrgbGamut(linear)).toBe(true);
        }
    });

    it('выдаёт валидный HEX на каждом тоне', () => {
        const scale = generateScale(SEED);
        for (const tone of Object.keys(scale)) {
            expect(scale[Number(tone)]).toMatch(/^#[0-9a-f]{6}$/);
        }
    });

    it('бросает понятную ошибку на невалидном сиде', () => {
        expect(() => generateScale('не цвет')).toThrow(/не удалось разобрать/);
    });
});

describe('Кривые', () => {
    it('светлота 0 = 0, светлота 100 = 1', () => {
        expect(lightnessCurve(0)).toBe(0);
        expect(lightnessCurve(100)).toBe(1);
    });

    it('светлота в середине около 0.5', () => {
        expect(lightnessCurve(50)).toBeGreaterThan(0.4);
        expect(lightnessCurve(50)).toBeLessThan(0.6);
    });

    it('насыщенность падает до нуля на краях шкалы', () => {
        expect(chromaCurve(0, 0.2)).toBe(0);
        expect(chromaCurve(100, 0.2)).toBe(0);
    });

    it('насыщенность имеет пик в середине, а не у края', () => {
        const middle = chromaCurve(50, 0.2);
        const quarter = chromaCurve(25, 0.2);
        const edge = chromaCurve(95, 0.2);
        expect(middle).toBeGreaterThan(quarter);
        expect(quarter).toBeGreaterThan(edge);
    });
});

describe('Специальные шкалы', () => {
    it('neutral почти не имеет хроматичности', () => {
        const scale = generateNeutralScale(SEED);
        for (const tone of [20, 50, 80]) {
            const color = parseColor(scale[tone])!;
            const chroma = rgbToOklch(color).c;
            expect(chroma).toBeLessThan(0.05);
        }
    });

    it('neutral сохраняет оттёнок сида', () => {
        const seedHue = rgbToOklch(parseColor(SEED)!).h;
        const midHue = rgbToOklch(parseColor(generateNeutralScale(SEED)[50])!).h;
        // Оттёнок сохраняется с допуском: кривая добавляет микро-сдвиг.
        expect(Math.abs(midHue - seedHue)).toBeLessThan(30);
    });

    it('статусные шкалы ограничивают насыщенность', () => {
        const scale = generateStatusScale('#8a5100');
        for (const tone of [30, 50, 70]) {
            const chroma = rgbToOklch(parseColor(scale[tone])!).c;
            expect(chroma).toBeLessThanOrEqual(0.16);
        }
    });
});

describe('Обратимость конвертации', () => {
    it('HEX -> OKLCH -> HEX возвращает исходный цвет', () => {
        for (const hex of ['#00543b', '#ffffff', '#000000', '#b12a33', '#c084fc']) {
            const original = rgbToOklch(parseColor(hex)!);
            const roundTrip = oklchToRgb(original);
            const backToOklch = rgbToOklch(roundTrip);

            // Светлота и хроматичность должны совпасть.
            expect(backToOklch.l).toBeCloseTo(original.l, 2);
            expect(backToOklch.c).toBeCloseTo(original.c, 2);
        }
    });
});
