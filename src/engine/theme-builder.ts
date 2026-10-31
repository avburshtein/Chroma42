/**
 * Движок 6: раскладка семантических токенов по режимам.
 *
 * Берёт семена (seeds) и примитивы (тональные ряды), применяет солвер к
 * каждой паре из реестра и строит полную раскладку Modes для всех 8
 * режимов темы (включая reduced-transparency).
 *
 * @see Docs/roadmap/Роадмап с учётом всех запланированных фич.md — Этап 6
 * @see Docs/Общая архитектура Chroma42.md — раздел 8
 */

import { composite } from './contrast/composite';
import { getContrastRatio } from './contrast/contrast';
import { PAIR_REGISTRY } from './policy/registry';
import {
    resolveThreshold,
    isReducedTransparency,
    modeScheme,
    type Policy,
    type ThemeMode,
} from './policy/policy';
import type { PairDefinition } from './policy/pair-registry';
import type { ToneScale } from './scale/scale-engine';
import type { Seeds, Primitives, Modes, SemanticValue, Semantics } from '../model/theme';
import type { SolveResult } from './solver/solver';

/** Стартовые тона для светлых схем (light-режимы). */
export const IDEAL_TONES_LIGHT: Readonly<Record<string, number>> = {
    // Поверхности
    background: 99,
    surface: 99,
    'surface-dim': 90,
    'surface-bright': 99,
    'surface-container-lowest': 100,
    'surface-container-low': 95,
    'surface-container': 90,
    'surface-container-high': 80,
    'surface-container-highest': 60,

    // Текст
    'on-surface': 5,
    'on-surface-variant': 30,
    'on-surface-muted': 50,
    placeholder: 60,
    disabled: 70,

    // Акценты
    primary: 50,
    'on-primary': 99,
    'primary-container': 90,
    'on-primary-container': 10,
    secondary: 50,
    'on-secondary': 99,
    'secondary-container': 90,
    'on-secondary-container': 10,
    tertiary: 50,
    'on-tertiary': 99,
    'tertiary-container': 90,
    'on-tertiary-container': 10,

    // Статусы
    success: 50,
    'on-success': 99,
    'success-container': 90,
    'on-success-container': 10,
    warning: 50,
    'on-warning': 99,
    'warning-container': 90,
    'on-warning-container': 10,
    error: 50,
    'on-error': 99,
    'error-container': 90,
    'on-error-container': 10,
    info: 50,
    'on-info': 99,
    'info-container': 90,
    'on-info-container': 10,

    // Границы и состояния
    outline: 60,
    'outline-variant': 70,
    border: 50,
    'border-strong': 40,
    'focus-ring': 5,
    scrim: 10,
} as const;


/** Стартовые тона для тёмных схем (dark-режимы). */
export const IDEAL_TONES_DARK: Readonly<Record<string, number>> = {
    // Поверхности — инвертированы
    background: 5,
    surface: 5,
    'surface-dim': 10,
    'surface-bright': 5,
    'surface-container-lowest': 0,
    'surface-container-low': 10,
    'surface-container': 20,
    'surface-container-high': 30,
    'surface-container-highest': 50,

    // Текст — инвертирован
    'on-surface': 99,
    'on-surface-variant': 90,
    'on-surface-muted': 70,
    placeholder: 60,
    disabled: 40,

    // Акценты — светлее для темного фона
    primary: 50,
    'on-primary': 5,
    'primary-container': 20,
    'on-primary-container': 99,
    secondary: 50,
    'on-secondary': 5,
    'secondary-container': 20,
    'on-secondary-container': 99,
    tertiary: 50,
    'on-tertiary': 5,
    'tertiary-container': 20,
    'on-tertiary-container': 99,

    // Статусы
    success: 50,
    'on-success': 5,
    'success-container': 20,
    'on-success-container': 99,
    warning: 50,
    'on-warning': 5,
    'warning-container': 20,
    'on-warning-container': 99,
    error: 50,
    'on-error': 5,
    'error-container': 20,
    'on-error-container': 99,
    info: 50,
    'on-info': 5,
    'info-container': 20,
    'on-info-container': 99,

    // Границы и состояния
    outline: 60,
    'outline-variant': 70,
    border: 50,
    'border-strong': 40,
    'focus-ring': 95,
    scrim: 90,
};

/** Токены, которые являются прозрачными (имеют alpha < 1 в базовой раскладке). */
const TRANSPARENT_TOKENS = new Set([
    'surface-glass',
    'overlay',
    'scrim',
]);

/**
 * Результат сборки темы.
 */
export type BuildModesResult = {
    modes: Modes;
    fixes: Record<string, number>;
    warnings: string[];
    resultsByMode: Readonly<Record<string, readonly SolveResult[]>>;
};


/**
 * Подбирает тона для пары, учитывая отдельные идеалы для переднего плана
 * и фона. В отличие от solvePair, который фиксирует фон на scale[idealTone],
 * здесь оба конца пары подбираются независимо.
 */
function solveSemanticPair(
    pair: PairDefinition,
    policy: Policy,
    mode: ThemeMode,
    fgScale: ToneScale,
    bgScale: ToneScale,
    idealForegroundTone: number,
    idealBackgroundTone: number,
    backdrop?: string,
): SolveResult {
    const threshold = resolveThreshold(pair, policy, mode);
    const availableTones = Object.keys(fgScale).map(Number);

    // Все комбинации (fg, bg), отсортированные по суммарному отклонению от идеалов
    const combinations = availableTones.flatMap((fg) =>
        availableTones.map((bg) => ({
            fg,
            bg,
            distance: Math.abs(fg - idealForegroundTone) + Math.abs(bg - idealBackgroundTone),
        }))
    ).sort((a, b) => a.distance - b.distance);

    let bestRatio = 0;
    let bestFg: number | null = null;
    let bestBg: number | null = null;

    for (const { fg, bg } of combinations) {
        const fgColor = fgScale[fg];
        const bgColor = bgScale[bg];

        if (!fgColor || !bgColor) continue;

        const ratio =
            pair.category === 'glass' && pair.requiresBackdrop
                ? getContrastRatio(
                      fgColor,
                      composite(bgColor, backdrop ?? bgColor).color,
                  )
                : getContrastRatio(fgColor, bgColor);

        if (ratio > bestRatio) {
            bestRatio = ratio;
            bestFg = fg;
            bestBg = bg;
        }

        if (ratio >= threshold.ratio - 1e-9) {
            return {
                pair: pair.key,
                idealTone: idealForegroundTone,
                solvedTone: fg,
                ratio,
                requiredRatio: threshold.ratio,
                solved: true,
                reason:
                    fg === idealForegroundTone && bg === idealBackgroundTone
                        ? 'Базовые тона проходят порог без корректировки.'
                        : `Тоны сдвинуты с ${idealForegroundTone}/${idealBackgroundTone} на ${fg}/${bg} — минимальное изменение, проходящее порог.`,
            };
        }
    }

    return {
        pair: pair.key,
        idealTone: idealForegroundTone,
        solvedTone: bestFg ?? null,
        ratio: bestRatio,
        requiredRatio: threshold.ratio,
        solved: false,
        reason: `Достижимый максимум ${bestRatio.toFixed(2)}:1 при требуемых ${threshold.ratio.toFixed(2)}:1.`,
    };
}

/**
 * Собирает полную раскладку семантических токенов для всех режимов.
 *
 * @param seeds      сид-цвета
 * @param primitives сгенерированные тональные ряды
 * @param policy     активная политика
 *
 * @returns modes, исправления (fixes) и предупреждения
 *
 * @example
 * const { modes, fixes, warnings } = buildModes(seeds, primitives, getPolicy('gov-aa'));
 */
export function buildModes(
    seeds: Seeds,
    primitives: Primitives,
    policy: Policy,
): BuildModesResult {
    const idealTonesByScheme: Record<'light' | 'dark', Record<string, number>> = {
        light: IDEAL_TONES_LIGHT,
        dark: IDEAL_TONES_DARK,
    };

    // Заполняется полностью в цикле ниже по allModes (все 8 режимов);
    // TypeScript не сужает это, поэтому корректный cast в момент объявления.
    const modes = {} as Modes;
    const fixes: Record<string, number> = {};
    const warnings: string[] = [];
    const resultsByMode: Record<string, SolveResult[]> = {};

    const allModes: ThemeMode[] = [
        'light-normal',
        'light-medium',
        'light-high',
        'light-reduced-transparency',
        'dark-normal',
        'dark-medium',
        'dark-high',
        'dark-reduced-transparency',
    ];

    for (const mode of allModes) {
        const scheme = modeScheme(mode);
        const idealTones = idealTonesByScheme[scheme];
        const isReduced = isReducedTransparency(mode);

        const semantics: Semantics = {};

        // Для reduced-transparency режимов прозрачные токены заменяются на fallback
        for (const pair of PAIR_REGISTRY) {
            const foregroundToken = pair.foreground;
            const backgroundToken = pair.background;

            const idealFg = idealTones[foregroundToken];
            const idealBg = idealTones[backgroundToken];

            if (idealFg === undefined || idealBg === undefined) {
                continue;
            }

            // Для glass-пар используется backdrop
            let backdrop: string | undefined;
            if (pair.requiresBackdrop) {
                const backdropTone = idealTones[pair.requiresBackdrop];
                backdrop =
                    backdropTone !== undefined
                        ? primitives.neutral[backdropTone]
                        : undefined;
            }

            // Выбираем примитив для foreground и background
            // Для on-токенов примитив — это тот же цвет без префикса on-
            const fgPrimitive = foregroundToken.startsWith('on-')
                ? foregroundToken.slice(3)
                : foregroundToken;
            const bgPrimitive = backgroundToken.startsWith('on-')
                ? backgroundToken.slice(3)
                : backgroundToken;

            // Если это neutral, используем neutral шкалу, иначе — цветной примитив
            const fgScaleName =
                fgPrimitive === 'neutral'
                    ? 'neutral'
                    : fgPrimitive.endsWith('primary') ||
                      fgPrimitive.endsWith('secondary') ||
                      fgPrimitive.endsWith('tertiary') ||
                      fgPrimitive.endsWith('success') ||
                      fgPrimitive.endsWith('warning') ||
                      fgPrimitive.endsWith('error') ||
                      fgPrimitive.endsWith('info')
                    ? fgPrimitive
                    : 'neutral';

            const bgScaleName =
                bgPrimitive === 'neutral'
                    ? 'neutral'
                    : bgPrimitive.endsWith('primary') ||
                      bgPrimitive.endsWith('secondary') ||
                      bgPrimitive.endsWith('tertiary') ||
                      bgPrimitive.endsWith('success') ||
                      bgPrimitive.endsWith('warning') ||
                      bgPrimitive.endsWith('error') ||
                      bgPrimitive.endsWith('info')
                    ? bgPrimitive
                    : 'neutral';

            const fgScale = primitives[fgScaleName as keyof Primitives] as ToneScale;
            const bgScale = primitives[bgScaleName as keyof Primitives] as ToneScale;

            const result = solveSemanticPair(
                pair,
                policy,
                mode,
                fgScale,
                bgScale,
                idealFg,
                idealBg,
                backdrop,
            );

            // Применяем результат: если solved, используем solvedTone, иначе ideal
            const finalFgTone = result.solvedTone ?? idealFg;

            // Для background используем idealBg, если foreground не изменился;
            // если foreground изменился, bg остаётся idealBg (первый проход)
            const finalBgTone = idealBg;

            // Для foreground-токена сохраняем ссылку на примитив
            semantics[foregroundToken] = {
                value: `{${fgPrimitive}.${finalFgTone}}`,
                alpha: 1,
            };

            // Для background-токена — аналогично
            semantics[backgroundToken] = {
                value: `{${bgPrimitive}.${finalBgTone}}`,
                alpha: 1,
            };

            // Для reduced-transparency режимов: если токен прозрачный, заменяем на fallback
            if (isReduced && TRANSPARENT_TOKENS.has(foregroundToken)) {
                semantics[foregroundToken] = {
                    value: `{${bgPrimitive}.${finalBgTone}}`,
                    alpha: 1,
                };
            }

            // Если солвер не нашёл решения, добавляем предупреждение
            if (!result.solved) {
                warnings.push(result.reason);
            }

            // Если тон изменился относительно идеала, фиксируем исправление
            if (finalFgTone !== idealFg) {
                fixes[foregroundToken] = finalFgTone;
            }
        }

        modes[mode] = semantics;
        resultsByMode[mode] = [];
    }

    return { modes, fixes, warnings, resultsByMode };
}
