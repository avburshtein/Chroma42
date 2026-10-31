/**
 * Тесты движка 7: экспорт темы в Tailwind v4.
 *
 * Проверяется полный путь: тема собирается настоящими движками (шкалы,
 * раскладка, аудит), затем экспортёр выдаёт tokens.css / tailwind.css /
 * passport.json. Отдельно — шлюз блокировки по обязательным парам.
 */

import { describe, expect, it } from 'vitest';
import {
    ExportBlockedError,
    REQUIRED_PAIRS,
    buildAuditReport,
    buildModes,
    exportTailwindTheme,
    flattenModes,
    generateNeutralScale,
    generateScale,
    generateStatusScale,
    getPolicy,
    resolveTokenValue,
} from '../src/engine';
import type { ChromaTheme, Seeds } from '../src/model/theme';
import type { Primitives } from '../src/engine';

const SEEDS: Seeds = {
    primary: '#1a5fb4',
    secondary: '#8a5522',
    tertiary: '#0f7d5c',
    neutral: '#808080',
    success: '#2e7d32',
    warning: '#e65100',
    error: '#c62828',
    info: '#0277bd',
};

const POLICY = getPolicy('gov-aa');

/** Шкалы только с neutral — для точечных тестов resolveTokenValue. */
const NEUTRAL_ONLY = {
    neutral: generateNeutralScale('#808080'),
} as Primitives;

function buildTestTheme(): ChromaTheme {
    const primitives = {
        primary: generateScale(SEEDS.primary),
        secondary: generateScale(SEEDS.secondary),
        tertiary: generateScale(SEEDS.tertiary),
        neutral: generateNeutralScale(SEEDS.neutral),
        success: generateStatusScale(SEEDS.success),
        warning: generateStatusScale(SEEDS.warning),
        error: generateStatusScale(SEEDS.error),
        info: generateStatusScale(SEEDS.info),
    };
    const { modes } = buildModes(SEEDS, primitives, POLICY);
    const flat = flattenModes({ modes, primitives });
    const audit = buildAuditReport(REQUIRED_PAIRS, flat, POLICY);

    return {
        meta: {
            name: 'Test Theme',
            policy: 'gov-aa',
            engine: 'oklch-custom-v1',
            engineVersion: '1.0.0-test',
            methodologyVersion: '2.1.0',
            createdAt: '2026-10-31T12:00:00.000Z',
        },
        seeds: SEEDS,
        primitives,
        modes,
        effects: {},
        audit,
    };
}

describe('resolveTokenValue', () => {
    it('разрешает ссылку на примитив в HEX', () => {
        const primitives = NEUTRAL_ONLY;
        const value = { value: '{neutral.10}', alpha: 1 };

        expect(resolveTokenValue(value, primitives)).toMatch(/^#[0-9a-f]{6}$/);
    });

    it('применяет альфа-канал: alpha 0.5 даёт hex8', () => {
        const primitives = NEUTRAL_ONLY;
        const value = { value: '{neutral.10}', alpha: 0.5 };

        expect(resolveTokenValue(value, primitives)).toMatch(/^#[0-9a-f]{8}$/);
    });

    it('принимает прямое цветовое значение', () => {
        const primitives = NEUTRAL_ONLY;
        const value = { value: '#123456', alpha: 1 };

        expect(resolveTokenValue(value, primitives)).toBe('#123456');
    });

    it('бросает ошибку на неизвестной шкале', () => {
        const primitives = NEUTRAL_ONLY;
        const value = { value: '{unknown.10}', alpha: 1 };

        expect(() => resolveTokenValue(value, primitives)).toThrow(/неизвестная/);
    });

    it('бросает ошибку на отсутствующем тоне', () => {
        const primitives = NEUTRAL_ONLY;
        const value = { value: '{neutral.999}', alpha: 1 };

        expect(() => resolveTokenValue(value, primitives)).toThrow(/отсутствует/);
    });
});

describe('flattenModes', () => {
    const theme = buildTestTheme();
    const flat = flattenModes(theme);

    it('даёт все 8 режимов', () => {
        expect(Object.keys(flat)).toHaveLength(8);
    });

    it('каждый режим содержит токен surface', () => {
        for (const [mode, tokens] of Object.entries(flat)) {
            expect(tokens['surface'], `режим ${mode}`).toMatch(/^#[0-9a-f]{6}$/);
        }
    });

    it('значения различаются между светом и тьмой', () => {
        expect(flat['light-normal'].surface).not.toBe(flat['dark-normal'].surface);
    });
});

describe('exportTailwindTheme', () => {
    const theme = buildTestTheme();
    const result = exportTailwindTheme(theme);
    const byName = Object.fromEntries(result.files.map((f) => [f.name, f.content]));

    it('выдаёт три файла: tokens.css, tailwind.css, passport.json', () => {
        expect(result.files.map((f) => f.name)).toEqual([
            'tokens.css',
            'tailwind.css',
            'passport.json',
        ]);
    });

    it('tokens.css содержит :root и все 8 блоков data-theme', () => {
        const css = byName['tokens.css'];
        expect(css).toContain(':root,\n[data-theme="light-normal"] {');
        for (const mode of [
            'light-medium',
            'light-high',
            'light-reduced-transparency',
            'dark-normal',
            'dark-medium',
            'dark-high',
            'dark-reduced-transparency',
        ]) {
            expect(css, `блок ${mode}`).toContain(`[data-theme="${mode}"] {`);
        }
    });

    it('tokens.css содержит переменную --c42-surface', () => {
        expect(byName['tokens.css']).toContain('    --c42-surface: #');
    });

    it('tailwind.css содержит @theme inline и маппинг на var(--c42-*)', () => {
        const css = byName['tailwind.css'];
        expect(css).toContain('@theme inline {');
        expect(css).toContain('    --color-surface: var(--c42-surface);');
    });

    it('tailwind.css определяет вариант dark по data-theme', () => {
        const css = byName['tailwind.css'];
        expect(css).toContain('@custom-variant dark');
        expect(css).toContain('[data-theme^="dark"]');
    });

    it('passport.json парсится как JSON и содержит сводку', () => {
        const passport = JSON.parse(byName['passport.json']) as {
            passportVersion: string;
            summary: { totalPairsChecked: number; exportAllowed: boolean };
        };
        expect(passport.passportVersion).toBe('1.0');
        expect(passport.summary.totalPairsChecked).toBeGreaterThan(0);
        expect(passport.summary.exportAllowed).toBe(true);
    });

    it('проверенная тема разрешает экспорт', () => {
        expect(theme.audit.summary.exportAllowed).toBe(true);
    });
});

describe('шлюз экспорта', () => {
    it('блокирует экспорт при провале обязательных пар', () => {
        const theme = buildTestTheme();
        const blocked: ChromaTheme = {
            ...theme,
            audit: {
                ...theme.audit,
                summary: { ...theme.audit.summary, exportAllowed: false },
            },
        };

        expect(() => exportTailwindTheme(blocked)).toThrow(ExportBlockedError);
    });

    it('сообщение об ошибке перечисляет проваленные пары', () => {
        const theme = buildTestTheme();
        const blocked: ChromaTheme = {
            ...theme,
            audit: {
                ...theme.audit,
                summary: { ...theme.audit.summary, exportAllowed: false },
                checks: [
                    ...theme.audit.checks,
                    {
                        pair: 'on-surface/surface',
                        mode: 'light-normal',
                        foregroundValue: '#333333',
                        backgroundValue: '#eeeeee',
                        context: 'text-normal',
                        requiredRatio: 7,
                        actualRatio: 4.5,
                        status: 'fail',
                        importance: 'required',
                        confidence: 'verified',
                    },
                ],
            },
        };

        try {
            exportTailwindTheme(blocked);
            expect.unreachable('экспорт должен был быть заблокирован');
        } catch (error) {
            expect(error).toBeInstanceOf(ExportBlockedError);
            const err = error as ExportBlockedError;
            expect(err.message).toContain('Экспорт заблокирован');
            expect(err.message).toContain('on-surface/surface');
            expect(err.failedPairs).toContain('on-surface/surface');
        }
    });
});

