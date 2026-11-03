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

import { alphaBlend, composite } from './contrast/composite';
import { getContrastRatio } from './contrast/contrast';
import { parseColor, formatHex } from './color/parse';
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

/**
 * Цветные тональные ряды, которые могут обслуживать семантические токены.
 */
const SCALE_NAMES = [
    'primary',
    'secondary',
    'tertiary',
    'success',
    'warning',
    'error',
    'info',
] as const;

type ScaleName = (typeof SCALE_NAMES)[number] | 'neutral';

/**
 * Определяет тональный ряд для семантического токена.
 *
 * Раньше шкала искалась через `endsWith('primary')` и т.п., но у токенов
 * вида `primary-container` имя заканчивается на `-container` — проверка
 * не срабатывала, и ВСЕ контейнерные токены получали НЕЙТРАЛЬНУЮ шкалу
 * вместо собственной цветной. Из-за этого `primary-container` был серым
 * (#dcdfdd) вместо тонированного (#c3e8d6) — контейнеры теряли акцент.
 */
function scaleNameFor(token: string): ScaleName {
    const base = token.startsWith('on-') ? token.slice(3) : token;
    const name = base.replace(/-container$/, '');
    return (SCALE_NAMES as readonly string[]).includes(name)
        ? (name as ScaleName)
        : 'neutral';
}

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
    'surface-glass': 99,
    overlay: 90,

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
    'surface-glass': 10,
    overlay: 20,

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
 * Альфа-канал для прозрачных токенов.
 *
 * Стекло — 0.7 (по методологии, раздел 5.2), оверлей — 0.8,
 * скрим — 0.5. В режиме reduced-transparency все прозрачные токены
 * заменяются на непрозрачные фолбэки (alpha = 1).
 *
 * @see Docs/Chroma42 Color Pair Methodology.md — раздел 5.2
 */
const TRANSPARENT_ALPHAS: Record<string, number> = {
    'surface-glass': 0.7,
    overlay: 0.8,
    scrim: 0.5,
};

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
 * Извлекает тон из ссылки `{scale.tone}`.
 * @returns число тона или `undefined`, если ссылка не распознана.
 */
function toneOfRef(value: string): number | undefined {
    const match = /^\{([A-Za-z-]+)\.(\d+)\}$/.exec(value);
    return match ? Number(match[2]) : undefined;
}

/**
 * Подбирает тона для пары, учитывая отдельные идеалы для переднего плана
 * и фона. В отличие от solvePair, который фиксирует фон на scale[idealTone],
 * здесь оба конца пары подбираются независимо.
 *
 * @param fixedBackgroundTone уже зафиксированный тон фона — если задан,
 *                            фон не подбирается (модель «первый писавший побеждает»).
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
    fixedBackgroundTone?: number,
    fixedForegroundTone?: number,
): SolveResult {
    const threshold = resolveThreshold(pair, policy, mode);

    // Для glass-пар с подложкой прозрачный фон «запекается» — так же, как
    // это делает аудит (checkPair → composite), чтобы солвер и паспорт
    // всегда считали одинаково.
    const reduced = isReducedTransparency(mode);
    const bgAlpha = reduced ? 1 : (TRANSPARENT_ALPHAS[pair.background] ?? 1);
    const useBaking =
        pair.category === 'glass' && !!pair.requiresBackdrop && !!backdrop && bgAlpha < 1;

    // Все комбинации (fg, bg), отсортированные по суммарному отклонению от идеалов
    const fgTones = fixedForegroundTone !== undefined ? [fixedForegroundTone] : Object.keys(fgScale).map(Number);
    const bgTones = fixedBackgroundTone !== undefined ? [fixedBackgroundTone] : Object.keys(bgScale).map(Number);
    const combinations = fgTones.flatMap((fg) =>
        bgTones.map((bg) => ({
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

        let bgForContrast = bgColor;

        if (useBaking) {
            const bgRgb = parseColor(bgColor);
            const backdropRgb = parseColor(backdrop!);
            if (bgRgb && backdropRgb) {
                bgForContrast = formatHex(
                    { ...alphaBlend(bgRgb, backdropRgb, bgAlpha), alpha: 1 },
                );
            }
        }

        const ratio = getContrastRatio(fgColor, bgForContrast);

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
                idealBgTone: idealBackgroundTone,
                solvedBgTone: bg,
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
        idealBgTone: idealBackgroundTone,
        solvedBgTone: bestBg ?? null,
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

            // Выбираем примитив для foreground и background.
            // Учитываем суффикс `-container`: `primary-container` должен
            // брать шкалу `primary`, а не `neutral`.
            const fgScaleName = scaleNameFor(foregroundToken);
            const bgScaleName = scaleNameFor(backgroundToken);

            const fgScale = primitives[fgScaleName] as ToneScale;
            const bgScale = primitives[bgScaleName] as ToneScale;

            // Модель «первый писавший побеждает»: если fg или bg уже записаны
            // более ранней парой, фиксируем их тона и не перезаписываем.
            const existingFg = semantics[foregroundToken];
            const existingBg = semantics[backgroundToken];
            const fixedFgTone = existingFg ? toneOfRef(existingFg.value) : undefined;
            const fixedBgTone = existingBg ? toneOfRef(existingBg.value) : undefined;

            const result = solveSemanticPair(
                pair,
                policy,
                mode,
                fgScale,
                bgScale,
                idealFg,
                idealBg,
                backdrop,
                fixedBgTone,
                fixedFgTone,
            );

            // Применяем результат: первый писавший сохраняет своё значение
            const finalFgTone = fixedFgTone ?? (result.solvedTone ?? idealFg);
            const finalBgTone = fixedBgTone ?? (result.solvedBgTone ?? idealBg);

            const isTransparent = TRANSPARENT_TOKENS.has(backgroundToken);
            const bgAlpha = isTransparent && !isReduced
                ? (TRANSPARENT_ALPHAS[backgroundToken] ?? 1)
                : 1;

            // Для foreground-токена сохраняем ссылку на примитивную шкалу
            // (по контракту SemanticValue ссылка указывает на примитив,
            // например {neutral.5}, а не на имя семантического токена).
            semantics[foregroundToken] = {
                value: `{${fgScaleName}.${finalFgTone}}`,
                alpha: 1,
            };

            // Для background-токена: прозрачные получают альфу и metadata,
            // непрозрачные — alpha = 1 без fallback.
            semantics[backgroundToken] = {
                value: `{${bgScaleName}.${finalBgTone}}`,
                alpha: bgAlpha,
                ...(bgAlpha < 1
                    ? {
                          fallback: `{${bgScaleName}.${finalBgTone}}`,
                          requiresBackdrop: pair.requiresBackdrop,
                      }
                    : {}),
            };

            // Если солвер не нашёл решения, добавляем предупреждение
            if (!result.solved) {
                warnings.push(result.reason);
            }

            // Если тон изменился относительно идеала, фиксируем исправление
            if (finalFgTone !== idealFg) {
                fixes[foregroundToken] = finalFgTone;
            }
            if (finalBgTone !== idealBg) {
                fixes[backgroundToken] = finalBgTone;
            }
        }

        modes[mode] = semantics;
        resultsByMode[mode] = [];
    }

    return { modes, fixes, warnings, resultsByMode };
}
