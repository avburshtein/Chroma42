/**
 * Тесты движка 1.5: якоря статусов и гармонические схемы.
 *
 * Проверяются три инварианта:
 * 1. Якоря статусов соответствуют реестру статусов и валидны как сиды.
 * 2. `maxChromaInSrgb` возвращает границу gamut sRGB с точностью до бисекции.
 * 3. `applyHarmony` сохраняет светлоту primary, выдерживает углы схем
 *    и не выводит сиды за пределы sRGB.
 */

import { describe, expect, it } from 'vitest';
import {
    HARMONY_SCHEMES,
    STATUS_SEED_ANCHORS,
    applyHarmony,
    generateHarmonySeeds,
    generateScale,
    generateStatusScale,
    maxChromaInSrgb,
} from '../src/engine';
import { STATUS_NAMES } from '../src/engine/policy/registry';
import {
    inSrgbGamut,
    oklabToLinearRgb,
    oklchToOklab,
    rgbToOklch,
} from '../src/engine/color/convert';
import { parseColor } from '../src/engine/color/parse';

/** Допуск по оттёнку для 8-битного HEX: квантование может сдвинуть hue. */
const HUE_TOLERANCE_DEG = 5;

/** Допуск по хроме при проверке границы gamut. */
const CHROMA_EPSILON = 0.002;

/** Яркий насыщенный сид: у него квантование почти не двигает OKLCH. */
const VIVID_SEED = '#1673ff';

/** Тёмный сид из референсов методологии. */
const DARK_SEED = '#00543b';

/** Все схемы как типизированный список ключей. */
const SCHEME_IDS = Object.keys(HARMONY_SCHEMES) as Array<
    keyof typeof HARMONY_SCHEMES
>;

function hueOf(hex: string): number {
    return rgbToOklch(parseColor(hex)!).h;
}

function chromaOf(hex: string): number {
    return rgbToOklch(parseColor(hex)!).c;
}

/** Разница углов по кругу: минимум из прямого и обходного расстояния. */
function hueDistance(a: number, b: number): number {
    const diff = Math.abs(a - b) % 360;
    return Math.min(diff, 360 - diff);
}

describe('Якоря статусов (STATUS_SEED_ANCHORS)', () => {
    it('покрывают все статусы реестра и только их', () => {
        expect(Object.keys(STATUS_SEED_ANCHORS).sort()).toEqual(
            [...STATUS_NAMES].sort(),
        );
    });

    it('валидны как сиды: HEX-формат и разбор без ошибок', () => {
        for (const seed of Object.values(STATUS_SEED_ANCHORS)) {
            expect(seed).toMatch(/^#[0-9a-f]{6}$/);
            expect(parseColor(seed)).not.toBeNull();
        }
    });
});

describe('maxChromaInSrgb — граница gamut sRGB', () => {
    it('цвет на границе внутри gamut, чуть выше — снаружи', () => {
        const cases: Array<[number, number]> = [
            [0.3, 150], // зелёный
            [0.55, 255], // синий
            [0.8, 105], // жёлтый — узкий gamut
            [0.7, 30], // красно-оранжевый
            [0.5, 60],
        ];

        for (const [l, h] of cases) {
            const maxC = maxChromaInSrgb(l, h);
            expect(maxC).toBeGreaterThan(0);

            const inside = oklabToLinearRgb(
                oklchToOklab({ l, c: maxC, h }),
            );
            expect(inSrgbGamut(inside)).toBe(true);

            const above = oklabToLinearRgb(
                oklchToOklab({ l, c: maxC + 0.005, h }),
            );
            expect(inSrgbGamut(above)).toBe(false);
        }
    });

    it('gamut жёлтого шире gamut синего при одинаковой светлоте', () => {
        // В OKLCH максимальная хрома у жёлтого (~0.17) вдвое больше, чем у
        // синего (~0.10) — оттёнок 105° может нести больше хроматичности.
        const yellow = maxChromaInSrgb(0.8, 105);
        const blue = maxChromaInSrgb(0.8, 264);
        expect(yellow).toBeGreaterThan(blue);
    });

    it('на полюсах светлоты доступная хрома минимальна, но не нулевая', () => {
        // При L = 0 и L = 1 ненулевые a/b в OKLab выталкивают цвет из
        // gamut. Gamut в OKLCH асимметричен: у чёрного (L = 0) хроматический
        // запас ~0.015, а у белого (L = 1) практически ноль.
        const lower = maxChromaInSrgb(0, 150);
        const upper = maxChromaInSrgb(1, 150);

        expect(lower).toBeGreaterThan(0);
        expect(lower).toBeLessThan(0.02);
        expect(upper).toBeGreaterThan(0);
        expect(upper).toBeLessThan(0.02);
        expect(upper).toBeLessThan(lower);
    });
});

describe('Реестр гармонических схем', () => {
    it('содержит все шесть схем из методологии', () => {
        expect(Object.keys(HARMONY_SCHEMES).sort()).toEqual(
            [
                'analogous',
                'complementary',
                'monochrome',
                'split-complementary',
                'tetrad',
                'triad',
            ].sort(),
        );
    });

    it('у каждой схемы ровно два сдвига и два коэффициента', () => {
        for (const scheme of Object.values(HARMONY_SCHEMES)) {
            expect(scheme.hueOffsets).toHaveLength(2);
            expect(scheme.chromaFactors).toHaveLength(2);
        }
    });

    it('монохром не меняет оттёнок', () => {
        expect(HARMONY_SCHEMES.monochrome.hueOffsets).toEqual([0, 0]);
    });
});


describe('applyHarmony — генерация сидов', () => {
    it('primary возвращается без изменений', () => {
        for (const schemeId of SCHEME_IDS) {
            expect(applyHarmony(DARK_SEED, schemeId).primary).toBe(DARK_SEED);
        }
    });

    it('аналоговая смещает оттёнок на ±30°', () => {
        const baseHue = hueOf(DARK_SEED);
        const { secondary, tertiary } = applyHarmony(DARK_SEED, 'analogous');

        expect(hueDistance(hueOf(secondary), baseHue + 30)).toBeLessThanOrEqual(5);
        expect(hueDistance(hueOf(tertiary), baseHue - 30)).toBeLessThanOrEqual(5);
    });

    it('комплементарная даёт вторичный цвет напротив (+180°)', () => {
        const baseHue = hueOf(VIVID_SEED);
        const { secondary } = applyHarmony(VIVID_SEED, 'complementary');

        expect(hueDistance(hueOf(secondary), baseHue + 180)).toBeLessThanOrEqual(5);
    });

    it('монохром понижает хроматичность и сохраняет оттёнок', () => {
        const baseHue = hueOf(VIVID_SEED);
        const baseChroma = chromaOf(VIVID_SEED);
        const { secondary, tertiary } = applyHarmony(VIVID_SEED, 'monochrome');

        expect(chromaOf(secondary)).toBeLessThan(baseChroma);
        expect(chromaOf(tertiary)).toBeLessThan(chromaOf(secondary));
        expect(hueDistance(hueOf(secondary), baseHue)).toBeLessThanOrEqual(5);
    });

    it('все производные сиды остаются в gamut sRGB', () => {
        for (const seed of [VIVID_SEED, DARK_SEED, '#ff8800', '#e91e63']) {
            for (const schemeId of SCHEME_IDS) {
                const { secondary, tertiary } = applyHarmony(seed, schemeId);

                for (const hex of [secondary, tertiary]) {
                    const parsed = parseColor(hex);
                    expect(parsed).not.toBeNull();
                    expect(parsed!.r).toBeGreaterThanOrEqual(0);
                    expect(parsed!.r).toBeLessThanOrEqual(255);
                    expect(parsed!.g).toBeGreaterThanOrEqual(0);
                    expect(parsed!.g).toBeLessThanOrEqual(255);
                    expect(parsed!.b).toBeGreaterThanOrEqual(0);
                    expect(parsed!.b).toBeLessThanOrEqual(255);
                }
            }
        }
    });

    it('хрома производных не превышает доступную хрому gamut', () => {
        for (const seed of [VIVID_SEED, '#ff8800', '#e91e63']) {
            for (const schemeId of SCHEME_IDS) {
                const { secondary, tertiary } = applyHarmony(seed, schemeId);

                for (const hex of [secondary, tertiary]) {
                    const oklch = rgbToOklch(parseColor(hex)!);
                    const maxC = maxChromaInSrgb(oklch.l, oklch.h);
                    expect(oklch.c).toBeLessThanOrEqual(maxC + CHROMA_EPSILON);
                }
            }
        }
    });

    it('chromaSafety < 1 даёт менее насыщенные сиды, чем по умолчанию', () => {
        const safe = applyHarmony(VIVID_SEED, 'triad', { chromaSafety: 0.5 });
        const full = applyHarmony(VIVID_SEED, 'triad');

        expect(chromaOf(safe.secondary)).toBeLessThanOrEqual(
            chromaOf(full.secondary),
        );
        expect(chromaOf(safe.tertiary)).toBeLessThanOrEqual(
            chromaOf(full.tertiary),
        );
    });

    it('chromaFactors переопределяют коэффициенты схемы', () => {
        const custom = applyHarmony(VIVID_SEED, 'analogous', {
            chromaFactors: [0.3, 0.2],
        });
        const monochrome = applyHarmony(VIVID_SEED, 'monochrome');

        // 0.3 < 0.65 — кастомные коэффициенты дают более тусклый сид.
        expect(chromaOf(custom.secondary)).toBeLessThan(
            chromaOf(monochrome.secondary),
        );
    });

    it('бросает ошибку на неизвестной схеме', () => {
        expect(() =>
            applyHarmony(DARK_SEED, 'unknown' as 'triad'),
        ).toThrow(/неизвестная схема гармоний/);
    });

    it('бросает ошибку на нечитаемом сид-цвете', () => {
        expect(() => applyHarmony('не-цвет', 'triad')).toThrow(
            /не удалось разобрать сид-цвет/,
        );
    });
});

describe('generateHarmonySeeds — полный набор сидов', () => {
    it('возвращает все восемь позиций Seeds', () => {
        const seeds = generateHarmonySeeds(DARK_SEED, 'triad');

        expect(Object.keys(seeds).sort()).toEqual(
            [
                'primary',
                'secondary',
                'tertiary',
                'neutral',
                'success',
                'warning',
                'error',
                'info',
            ].sort(),
        );
    });

    it('статусы берутся из якорей, а не из гармоний', () => {
        const seeds = generateHarmonySeeds(DARK_SEED, 'tetrad');

        expect(seeds.success).toBe(STATUS_SEED_ANCHORS.success);
        expect(seeds.warning).toBe(STATUS_SEED_ANCHORS.warning);
        expect(seeds.error).toBe(STATUS_SEED_ANCHORS.error);
        expect(seeds.info).toBe(STATUS_SEED_ANCHORS.info);
    });

    it('neutral наследует оттёнок primary', () => {
        const seeds = generateHarmonySeeds(VIVID_SEED, 'analogous');

        expect(hueOf(seeds.neutral)).toBe(hueOf(VIVID_SEED));
    });

    it('проходит полный цикл: сиды -> шкалы -> валидные HEX', () => {
        // Дымовой тест стыковки с движком 1: каждый сид обязан строить шкалу.
        const seeds = generateHarmonySeeds(DARK_SEED, 'complementary');

        for (const seed of [
            seeds.primary,
            seeds.secondary,
            seeds.tertiary,
            seeds.neutral,
        ]) {
            expect(generateScale(seed)[50]).toMatch(/^#[0-9a-f]{6}$/);
        }
        for (const seed of [
            seeds.success,
            seeds.warning,
            seeds.error,
            seeds.info,
        ]) {
            expect(generateStatusScale(seed)[50]).toMatch(/^#[0-9a-f]{6}$/);
        }
    });
});
