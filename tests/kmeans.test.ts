/**
 * Тесты движка 1.5 (часть 2): детерминированная кластеризация k-means.
 *
 * Тесты работают на синтетических пиксельных массивах — картинки не нужны
 * (этап 12.3): проверяются детерминизм, отсев серых и экстремумов,
 * мерж близких оттёнков, ранжирование «вес × хрома», fallback для
 * монохромных картинок и боксированный даунсэмплинг.
 */

import { describe, expect, it } from 'vitest';
import { downsamplePixels, extractSeedCandidates } from '../src/engine/seeds/kmeans';
import { rgbToOklch } from '../src/engine/color/convert';
import { parseColor } from '../src/engine/color/parse';
import type { Rgb } from '../src/engine/color/types';

/** Строит массив одинаковых пикселей из HEX. */
function fill(hex: string, count: number): Rgb[] {
    const parsed = parseColor(hex)!;
    return Array.from({ length: count }, () => ({
        r: parsed.r,
        g: parsed.g,
        b: parsed.b,
    }));
}

function hueOf(hex: string): number {
    return rgbToOklch(parseColor(hex)!).h;
}

/** Сложная синтетическая сцена для тестов детерминизма. */
const MIXED_SCENE: Rgb[] = [
    ...fill('#dc2626', 30),
    ...fill('#2563eb', 30),
    ...fill('#16a34a', 20),
    ...fill('#eab308', 10),
    ...fill('#808080', 10),
];

describe('downsamplePixels — боксированное уменьшение', () => {
    it('усредняет блоки: шахматная доска 4×4 → 2×2', () => {
        const data: number[] = [];
        for (let y = 0; y < 4; y++) {
            for (let x = 0; x < 4; x++) {
                const red = (x + y) % 2 === 0;
                data.push(red ? 255 : 37, red ? 0 : 99, red ? 0 : 235, 255);
            }
        }

        const pixels = downsamplePixels(data, 4, 4, 2);

        expect(pixels).toHaveLength(4);
        // Каждый блок 2×2: два красных + два синих пикселя.
        for (const p of pixels) {
            expect(p.r).toBe(146); // (255+37+255+37)/4
            expect(p.g).toBe(50); // Math.round((0+99+0+99)/4)
            expect(p.b).toBe(118); // Math.round((0+235+0+235)/4)
        }
    });

    it('сохраняет пропорции: 128×64 → 2048 пикселей', () => {
        const data = new Array(128 * 64 * 4).fill(128);
        const pixels = downsamplePixels(data, 128, 64, 64);
        expect(pixels).toHaveLength(64 * 32);
    });

    it('пропускает полностью прозрачные пиксели', () => {
        const data = [
            255, 0, 0, 255, 0, 0, 0, 0,
            0, 255, 0, 255, 0, 0, 255, 255,
        ];
        const pixels = downsamplePixels(data, 2, 2, 64);
        expect(pixels).toHaveLength(3);
    });
});

describe('extractSeedCandidates — базовые сценарии', () => {
    it('пустой массив даёт пустой список', () => {
        expect(extractSeedCandidates([])).toEqual([]);
    });

    it('однородная картинка даёт один кандидат с весом ~1', () => {
        const candidates = extractSeedCandidates(fill('#22c55e', 100));

        expect(candidates).toHaveLength(1);
        expect(candidates[0].hex).toBe('#22c55e');
        expect(candidates[0].weight).toBeCloseTo(1, 6);
    });

    it('два цветных блока дают двух кандидатов', () => {
        const candidates = extractSeedCandidates([
            ...fill('#dc2626', 50),
            ...fill('#2563eb', 50),
        ]);

        expect(candidates).toHaveLength(2);

        const redHue = hueOf('#dc2626');
        const blueHue = hueOf('#2563eb');
        const hues = candidates.map((c) => c.hue);

        expect(
            hues.some((h) => Math.abs(h - redHue) <= 5),
        ).toBe(true);
        expect(
            hues.some((h) => Math.abs(h - blueHue) <= 5),
        ).toBe(true);

        const totalWeight = candidates.reduce((sum, c) => sum + c.weight, 0);
        expect(totalWeight).toBeCloseTo(1, 6);
    });

    it('монохромная картинка не даёт пустого списка (fallback)', () => {
        const candidates = extractSeedCandidates(fill('#808080', 100));

        expect(candidates.length).toBeGreaterThan(0);
        for (const c of candidates) {
            expect(c.hex).toMatch(/^#[0-9a-f]{6}$/);
        }
    });

    it('серый фон отсеивается, цветной объект становится кандидатом', () => {
        const candidates = extractSeedCandidates([
            ...fill('#ffffff', 90),
            ...fill('#e11d48', 10),
        ]);

        expect(candidates).toHaveLength(1);
        const redHue = hueOf('#e11d48');
        expect(Math.abs(candidates[0].hue - redHue)).toBeLessThanOrEqual(5);
    });
});

describe('extractSeedCandidates — мерж и ранжирование', () => {
    it('близкие оттёнки мержатся в один кластер', () => {
        // #16a34a и #15803d: Δhue < 15°, Δchroma < 0.05 — это один зелёный.
        const candidates = extractSeedCandidates([
            ...fill('#16a34a', 50),
            ...fill('#15803d', 50),
        ]);

        expect(candidates).toHaveLength(1);
        const greenHue = hueOf('#16a34a');
        expect(Math.abs(candidates[0].hue - greenHue)).toBeLessThanOrEqual(5);
        expect(candidates[0].weight).toBeCloseTo(1, 6);
    });

    it('ранжирование учитывает вес и хрому', () => {
        // Большой блок умеренно-насыщенного зелёного и маленький, но
        // очень насыщенный красный: score зелёного выше.
        const candidates = extractSeedCandidates([
            ...fill('#16a34a', 80),
            ...fill('#e11d48', 20),
        ]);

        expect(candidates.length).toBeGreaterThanOrEqual(2);
        const greenHue = hueOf('#16a34a');
        expect(Math.abs(candidates[0].hue - greenHue)).toBeLessThanOrEqual(5);
    });

    it('детерминизм: два запуска дают идентичный результат', () => {
        const first = extractSeedCandidates(MIXED_SCENE);
        const second = extractSeedCandidates(MIXED_SCENE);

        expect(second).toEqual(first);
    });

    it('соблюдает ограничение maxCandidates', () => {
        const candidates = extractSeedCandidates(
            [
                ...fill('#dc2626', 17),
                ...fill('#eab308', 17),
                ...fill('#16a34a', 17),
                ...fill('#06b6d4', 17),
                ...fill('#2563eb', 17),
                ...fill('#db2777', 17),
            ],
            { maxCandidates: 3 },
        );

        expect(candidates).toHaveLength(3);
    });

    it('кандидаты — валидные HEX в пределах gamut', () => {
        const candidates = extractSeedCandidates(MIXED_SCENE);

        expect(candidates.length).toBeGreaterThan(0);
        for (const c of candidates) {
            expect(c.hex).toMatch(/^#[0-9a-f]{6}$/);
            expect(parseColor(c.hex)).not.toBeNull();
            expect(c.weight).toBeGreaterThan(0);
            expect(c.weight).toBeLessThanOrEqual(1);
            expect(c.chroma).toBeGreaterThanOrEqual(0);
            expect(c.hue).toBeGreaterThanOrEqual(0);
            expect(c.hue).toBeLessThan(360);
        }
    });
});
