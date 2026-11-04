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
import { buildThemeBundle } from '../src/lib/theme-pipeline';
import { generateHarmonySeeds } from '../src/engine/seeds/schemes';

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

describe('Шкала, якоренная на сиде', () => {
    it('тон 50 совпадает с сидом', () => {
        for (const seed of ['#053820', '#00c788', '#ccff00', '#0b6e4f', '#b12a33']) {
            const scale = generateScale(seed, { anchorSeed: true });
            expect(scale[50].toLowerCase()).toBe(seed.toLowerCase());
        }
    });

    it('без якоря тон 50 НЕ совпадает с сидом', () => {
        // Обычная шкала подгоняет светлоту под тон — сид «размывается».
        const scale = generateScale('#00c788');
        expect(scale[50].toLowerCase()).not.toBe('#00c788');
    });

    it('светлота тона 50 равна светлоте сида', () => {
        const seed = '#00c788';
        const seedL = rgbToOklch(parseColor(seed)!).l;
        const scale = generateScale(seed, { anchorSeed: true });
        expect(rgbToOklch(parseColor(scale[50])!).l).toBeCloseTo(seedL, 2);
    });

    it('шкала остаётся монотонной по светлоте', () => {
        for (const seed of ['#053820', '#00c788', '#ccff00']) {
            const scale = generateScale(seed, { anchorSeed: true });
            expect(isMonotonic(scale)).toBe(true);
        }
    });

    it('насыщенность тона 50 не ниже, чем у обычной шкалы', () => {
        const seed = '#00c788';
        const anchored = rgbToOklch(parseColor(generateScale(seed, { anchorSeed: true })[50])!).c;
        const plain = rgbToOklch(parseColor(generateScale(seed)[50])!).c;
        expect(anchored).toBeGreaterThanOrEqual(plain);
    });
});

describe('Минимальная насыщенность нейтрали', () => {
    it('по умолчанию холст строго серый (minChroma = 0)', () => {
        const plain = generateNeutralScale('#1d3d6c');
        const scale = generateNeutralScale('#1d3d6c', { minChroma: 0.04 });
        // Без минимума тон 90 — почти ахроматичный.
        const plainC = rgbToOklch(parseColor(plain[90])!).c;
        expect(plainC).toBeLessThan(0.006);
        // С минимумом — ощутимо цветнее.
        const tintedC = rgbToOklch(parseColor(scale[90])!).c;
        expect(tintedC).toBeGreaterThan(plainC);
    });

    it('минимум работает и для приглушённых сидов', () => {
        // Сид с почти нулевой хромой: без минимума холст серый.
        const gray = generateNeutralScale('#888888');
        const tinted = generateNeutralScale('#888888', { minChroma: 0.04 });
        const grayC = rgbToOklch(parseColor(gray[90])!).c;
        const tintedC = rgbToOklch(parseColor(tinted[90])!).c;
        expect(tintedC).toBeGreaterThan(grayC);
    });

    it('аудит и критерии доступности не меняются', () => {
        // Поднятие насыщенности нейтрали не влияет на контрастные пары:
        // светлота поверхностей почти та же, а солвер подбирает ТОН, а не цвет.
        const seeds = generateHarmonySeeds('#1d3d6c', 'triad');
        const plain = buildThemeBundle('t', seeds, 'standard-aa');
        const tinted = buildThemeBundle('t', seeds, 'standard-aa', {
            neutralMinChroma: 0.04,
        });
        expect(tinted.theme.audit.summary.totalPairsChecked).toBe(
            plain.theme.audit.summary.totalPairsChecked,
        );
        expect(tinted.theme.audit.summary.passed).toBe(
            plain.theme.audit.summary.passed,
        );
        expect(tinted.theme.audit.summary.failed).toBe(
            plain.theme.audit.summary.failed,
        );
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
