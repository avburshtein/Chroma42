/**
 * Интеграционный тест: полный путь от сид-цвета до паспорта темы.
 *
 * Проверяет, что движки работают вместе и дают непротиворечивый результат:
 * шкалы строятся, пары проходят аудит, паспорт формируется.
 */

import { describe, expect, it } from 'vitest';
import {
    PAIR_REGISTRY,
    REQUIRED_PAIRS,
    generateNeutralScale,
    generateScale,
    generateStatusScale,
    getPolicy,
    resolveThreshold,
    findPair,
    pairsByCategory,
} from '../src/engine';
import { buildAuditReport, buildPassport, checkPair } from '../src/engine/audit/audit';
import { solvePair, toneSearchOrder } from '../src/engine/solver/solver';

const NEUTRAL_SEED = '#00543b';

describe('Реестр пар', () => {
    it('содержит пары во всех категориях', () => {
        const categories = [
            'text',
            'container',
            'status',
            'form',
            'focus',
            'glass',
        ] as const;
        for (const category of categories) {
            expect(pairsByCategory(category).length).toBeGreaterThan(0);
        }
    });

    it('имеет 8 статусных пар (4 статуса x 2 варианта)', () => {
        expect(pairsByCategory('status')).toHaveLength(8);
    });

    it('у каждой пары уникальный ключ', () => {
        const keys = PAIR_REGISTRY.map((pair) => pair.key);
        expect(new Set(keys).size).toBe(keys.length);
    });

    it('у каждой glass-пары указана обязательная подложка', () => {
        for (const pair of pairsByCategory('glass')) {
            expect(pair.requiresBackdrop).toBeDefined();
        }
    });

    it('находит пару по ключу', () => {
        expect(findPair('on-surface/surface')?.context).toBe('text-normal');
        expect(findPair('несуществующая')).toBeUndefined();
    });

    it('обязательные пары — подмножество реестра', () => {
        for (const pair of REQUIRED_PAIRS) {
            expect(PAIR_REGISTRY).toContain(pair);
        }
    });
});

describe('Пороги политик', () => {
    const pair = findPair('on-surface/surface')!;

    it('standard-aa: обычный текст требует 4.5:1', () => {
        expect(resolveThreshold(pair, getPolicy('standard-aa'), 'light-normal').ratio).toBe(4.5);
    });

    it('standard-aaa: обычный текст требует 7:1', () => {
        expect(resolveThreshold(pair, getPolicy('standard-aaa'), 'light-normal').ratio).toBe(7);
    });

    it('medium-режим повышает порог', () => {
        const base = resolveThreshold(pair, getPolicy('gov-aa'), 'light-normal').ratio;
        const medium = resolveThreshold(pair, getPolicy('gov-aa'), 'light-medium').ratio;
        expect(medium).toBeGreaterThan(base);
    });

    it('high-режим повышает порог', () => {
        const normal = resolveThreshold(pair, getPolicy('gov-aa'), 'dark-normal').ratio;
        const high = resolveThreshold(pair, getPolicy('gov-aa'), 'dark-high').ratio;
        expect(high).toBeGreaterThan(normal);
    });

    it('фокус в high-режиме не опускается ниже 4.5:1', () => {
        const focus = findPair('focus-ring/surface')!;
        const high = resolveThreshold(focus, getPolicy('standard-aa'), 'light-high').ratio;
        expect(high).toBeGreaterThanOrEqual(4.5);
    });

    it('политики различаются уровнем строгости', () => {
        expect(getPolicy('standard-aa').strict).toBe(false);
        expect(getPolicy('gov-aa').strict).toBe(true);
        expect(getPolicy('gov-high-contrast').strict).toBe(true);
    });
});

describe('Солвер', () => {
    it('порядок перебора начинается с идеального тона', () => {
        expect(toneSearchOrder(10, [0, 5, 10, 20, 30])[0]).toBe(10);
    });

    it('порядок перебора идёт по возрастанию отклонения', () => {
        const order = toneSearchOrder(20, [0, 5, 10, 20, 30, 40]);
        const distances = order.map((tone) => Math.abs(tone - 20));
        expect(distances).toEqual([...distances].sort((a, b) => a - b));
    });

    it('находит проходящий тон для пары on-surface/surface', () => {
        const neutral = generateNeutralScale(NEUTRAL_SEED);
        const pair = findPair('on-surface/surface')!;
        const result = solvePair(pair, getPolicy('gov-aa'), 'light-normal', neutral, 10);

        expect(result.solved).toBe(true);
        expect(result.solvedTone).not.toBeNull();
        expect(result.ratio).toBeGreaterThanOrEqual(result.requiredRatio);
    });
});


describe('Полный цикл: сид -> шкалы -> аудит -> паспорт', () => {
    /**
     * Собирает раскладку токенов для схемы light или dark.
     * Тоны подобраны так, чтобы основные пары проходили: на светлом фоне
     * тёмный текст, на тёмном — светлый.
     */
    const buildMode = (scheme: 'light' | 'dark'): Record<string, string> => {
        const neutral = generateNeutralScale(NEUTRAL_SEED);
        const primary = generateScale(NEUTRAL_SEED);

        const flip = scheme === 'dark';
        const surfaceTone = flip ? 5 : 99;
        const onSurfaceTone = flip ? 99 : 5;
        // Тон 50 подобран солвером: он позволяет одному и тому же
        // тёмному focus-ring пройти порог 3:1 и на поверхности, и на
        // самом акценте. Слишком тёмный акцент «съедает» тёмное кольцо.
        const primaryTone = 50;
        // На светлом фоне акцент тёмный и текст на нём светлый, и наоборот.
        const onAccentTone = flip ? 5 : 99;

        // Статусные шкалы строятся из собственных сидов.
        const statusSeeds = {
            success: '#1b5e20',
            warning: '#8a5100',
            error: '#b12a33',
            info: '#00543b',
        } as const;

        const status = Object.fromEntries(
            Object.entries(statusSeeds).flatMap(([name, seed]) => {
                const scale = generateStatusScale(seed);
                // Плашка статуса берётся из среднего тона — на ней нужен
                // СВЕТЛЫЙ текст. Контейнер берётся из светлого тона —
                // на нём нужен ТЁМНЫЙ текст. Перепутать это — классическая
                // ошибка, которую ловит именно аудит.
                const badge = scale[primaryTone];
                const container = scale[flip ? 20 : 90];

                // Object.fromEntries ждёт массив ПАР [ключ, значение],
                // а не плоский список значений.
                return [
                    [name, badge],
                    [`on-${name}`, neutral[flip ? 5 : 99]],
                    [`${name}-container`, container],
                    [`on-${name}-container`, neutral[flip ? 99 : 5]],
                ] as const;
            }),
        );

        return {
            // Поверхности
            surface: neutral[surfaceTone],
            background: neutral[surfaceTone],
            'surface-container': neutral[surfaceTone],
            'surface-container-high': neutral[surfaceTone],

            // Текст
            'on-surface': neutral[onSurfaceTone],
            'on-surface-variant': neutral[onSurfaceTone],
            'on-surface-muted': neutral[onSurfaceTone],
            placeholder: neutral[onSurfaceTone],
            disabled: neutral[onSurfaceTone],

            // Акценты. Контейнер — светлый тон, поэтому текст в нём тёмный.
            primary: primary[primaryTone],
            'on-primary': neutral[onAccentTone],
            'primary-container': primary[flip ? 20 : 90],
            'on-primary-container': neutral[flip ? 99 : 5],
            secondary: primary[flip ? 70 : 30],
            'on-secondary': neutral[onAccentTone],
            'secondary-container': primary[flip ? 20 : 90],
            'on-secondary-container': neutral[flip ? 99 : 5],
            tertiary: primary[flip ? 60 : 40],
            'on-tertiary': neutral[onAccentTone],
            'tertiary-container': primary[flip ? 20 : 90],
            'on-tertiary-container': neutral[flip ? 99 : 5],

            // Статусы
            ...status,

            // Границы и состояния
            // Тон 60 — самый светлый, ещё проходящий 3:1 на светлой
            // поверхности; tone 70 даёт лишь 2.58 и не проходит.
            outline: neutral[flip ? 40 : 60],
            'border-strong': neutral[flip ? 30 : 60],
            // Фокус контрастирует и с поверхностью, и с акцентом.
            'focus-ring': primary[flip ? 95 : 5],

            // Прозрачный токен: b3 = 70% непрозрачности.
            'surface-glass': `${neutral[surfaceTone]}b3`,
        };
    };

    it('аудит считает статусы согласованно с общим числом проверок', () => {
        const modes = {
            'light-normal': buildMode('light'),
            'dark-normal': buildMode('dark'),
        };

        const report = buildAuditReport(REQUIRED_PAIRS, modes, getPolicy('gov-aa'));

        expect(report.summary.totalPairsChecked).toBeGreaterThan(0);
        expect(report.checks).toHaveLength(report.summary.totalPairsChecked);
        expect(report.summary.passed + report.summary.failed).toBe(
            report.summary.totalPairsChecked,
        );
    });

    it('light-normal проходит обязательные пары политики gov-aa', () => {
        const report = buildAuditReport(
            REQUIRED_PAIRS,
            { 'light-normal': buildMode('light') },
            getPolicy('gov-aa'),
        );

        expect(report.summary.exportAllowed).toBe(true);
    });

    it('glass-пара помечается как проверенная с подложкой', () => {
        const pair = findPair('on-surface/surface-glass')!;
        const { check } = checkPair(
            pair,
            buildMode('light'),
            getPolicy('gov-aa'),
            'light-normal',
        );

        expect(check.pair).toBe('on-surface/surface-glass');
        expect(check.confidence).toBe('verified-with-backdrop');
    });

    it('паспорт содержит методологию, версии и дисклеймер', () => {
        const report = buildAuditReport(
            [findPair('on-surface/surface')!],
            { 'light-normal': buildMode('light') },
            getPolicy('gov-aa'),
        );
        const passport = buildPassport(report, 'gov-aa', '2026-09-28T12:00:00Z');

        expect(passport.passportVersion).toBe('1.0');
        expect(passport.engineVersion).toContain('chroma42');
        expect(passport.methodology).toMatchObject({
            name: 'Chroma42 Color Pair Methodology',
            version: '1.0.0',
            colorSpace: 'OKLCH',
        });
        expect(String(passport.legalDisclaimer)).toContain(
            'не является юридическим сертификатом',
        );
    });

    it('все статусные шкалы генерируются из сидов', () => {
        for (const seed of ['#1b5e20', '#8a5100', '#b12a33', '#00543b']) {
            expect(generateStatusScale(seed)[50]).toMatch(/^#[0-9a-f]{6}$/);
        }
    });
});
