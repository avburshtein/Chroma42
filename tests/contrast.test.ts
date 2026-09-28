/**
 * Эталонные тесты контраста по WCAG 2.2.
 *
 * Значения взяты из раздела 10.1 методологии — это «инженерная
 * верификация», которая заменяет маркетинговые обещания проверяемыми
 * утверждениями.
 *
 * @see Docs/Chroma42 Color Pair Methodology.md — раздел 10.1
 */

import { describe, expect, it } from 'vitest';
import {
    apcaAbsLc,
    apcaLc,
    getContrastRatio,
    meetsThreshold,
    relativeLuminance,
} from '../src/engine/contrast/contrast';

describe('WCAG 2.2: относительная яркость', () => {
    it('чёрный = 0, белый = 1', () => {
        expect(relativeLuminance('#000000')).toBeCloseTo(0, 5);
        expect(relativeLuminance('#ffffff')).toBeCloseTo(1, 5);
    });

    it('показывает коэффициенты формулы L = 0.2126R + 0.7152G + 0.0722B', () => {
        // Чистый красный: 0.2126, чистый зелёный: 0.7152, синий: 0.0722.
        expect(relativeLuminance('#ff0000')).toBeCloseTo(0.2126, 4);
        expect(relativeLuminance('#00ff00')).toBeCloseTo(0.7152, 4);
        expect(relativeLuminance('#0000ff')).toBeCloseTo(0.0722, 4);
    });
});

describe('WCAG 2.2: коэффициент контраста', () => {
    it('чёрный на белом даёт максимум 21:1', () => {
        expect(getContrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 2);
    });

    it('#767676 на белом проходит порог 4.5:1', () => {
        const ratio = getContrastRatio('#767676', '#ffffff');
        expect(ratio).toBeGreaterThanOrEqual(4.5);
        // Эталон: 4.5422
        expect(ratio).toBeCloseTo(4.54, 2);
    });

    it('#777777 на белом не проходит порог 4.5:1', () => {
        // ПРИМЕЧАНИЕ: в методологии (раздел 10.1) указана пара #757575
        // как непроходящая. Это фактическая ошибка: #757575 на белом даёт
        // 4.61 и проходит AA. Реальная граница — #777777 (4.48).
        // Тест зафиксирован по фактическим значениям формулы WCAG 2.2.
        expect(getContrastRatio('#777777', '#ffffff')).toBeLessThan(4.5);
        expect(getContrastRatio('#777777', '#ffffff')).toBeCloseTo(4.48, 2);
    });

    it('#757575 на белом проходит AA (опровергает значение из методологии)', () => {
        expect(getContrastRatio('#757575', '#ffffff')).toBeGreaterThanOrEqual(4.5);
    });

    it('симметричен: отношение не зависит от порядка аргументов', () => {
        const forward = getContrastRatio('#00543b', '#ffffff');
        const backward = getContrastRatio('#ffffff', '#00543b');
        expect(forward).toBeCloseTo(backward, 10);
    });

    it('одинаковые цвета дают минимальный контраст 1:1', () => {
        expect(getContrastRatio('#00543b', '#00543b')).toBeCloseTo(1, 10);
    });
});

describe('WCAG 2.2: пороги по контексту', () => {
    it('обычный текст AA требует 4.5:1', () => {
        expect(meetsThreshold(4.5, 'text-normal', 'AA')).toBe(true);
        expect(meetsThreshold(4.49, 'text-normal', 'AA')).toBe(false);
    });

    it('крупный текст AA требует 3:1', () => {
        expect(meetsThreshold(3, 'text-large', 'AA')).toBe(true);
        expect(meetsThreshold(2.9, 'text-large', 'AA')).toBe(false);
    });

    it('фокус-индикатор AA требует 3:1', () => {
        expect(meetsThreshold(3, 'focus-indicator', 'AA')).toBe(true);
        expect(meetsThreshold(2.9, 'focus-indicator', 'AA')).toBe(false);
    });

    it('обычный текст AAA требует 7:1', () => {
        expect(meetsThreshold(7, 'text-normal', 'AAA')).toBe(true);
        expect(meetsThreshold(6.9, 'text-normal', 'AAA')).toBe(false);
    });
});

describe('APCA: дополнительный показатель', () => {
    // Значения сверяются с эталонной таблицей спецификации APCA W3 0.1.9.
    it('чёрный на белом даёт Lc 106.04', () => {
        expect(apcaLc('#000000', '#ffffff')).toBeCloseTo(106.04, 1);
    });

    it('белый на чёрном даёт отрицательную полярность -107.88', () => {
        expect(apcaLc('#ffffff', '#000000')).toBeCloseTo(-107.88, 1);
    });

    it('#888888 на белом даёт Lc 63.06', () => {
        expect(apcaLc('#888888', '#ffffff')).toBeCloseTo(63.06, 1);
    });

    it('одинаковые цвета дают нулевой контраст', () => {
        expect(apcaAbsLc('#767676', '#767676')).toBe(0);
    });

    it('учитывает полярность: чёрный/белый ≠ белый/чёрный', () => {
        const forward = apcaLc('#000000', '#ffffff');
        const backward = apcaLc('#ffffff', '#000000');
        expect(forward).toBeGreaterThan(0);
        expect(backward).toBeLessThan(0);
    });

    it('APCA не используется как нормативный критерий в политиках', () => {
        // Lc ~ 63 и WCAG 4.5 — несопоставимые шкалы. Именно поэтому APCA
        // помечен в методологии как доп. метрика, а не заменяет WCAG.
        const wcag = getContrastRatio('#888888', '#ffffff');
        const apca = apcaLc('#888888', '#ffffff');
        expect(wcag).toBeGreaterThan(3);
        expect(apca).toBeGreaterThan(60);
        expect(apca / 10).not.toBeCloseTo(wcag, 0);
    });
});
