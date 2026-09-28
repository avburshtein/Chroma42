/**
 * Движок 3: солвер доступных цветов.
 *
 * Не просто проверяет, а автоматически подбирает тона, которые проходят
 * порог политики, сохраняя максимально возможную близость к идеалу.
 *
 * Стратегия:
 *   1. Берём базовую привязку тона (например `neutral.10`).
 *   2. Проверяем контраст через Contrast Engine.
 *   3. Если не проходит — перебираем соседние тона в порядке минимального
 *      отклонения от идеала (ближе к центру шкалы = меньше «прыжок»).
 *   4. Если ни один тон не подходит — помечаем пару как требующую
 *      ручной проверки: физически невозможно достичь порога.
 *
 * @see Docs/Общая архитектура Chroma42.md — раздел 4
 * @see Docs/roadmap — Этап 4 «Солвер доступных цветов»
 */

import { getContrastRatio } from '../contrast/contrast';
import { composite } from '../contrast/composite';
import type { ToneScale } from '../scale/scale-engine';
import type { PairDefinition } from '../policy/pair-registry';
import type { Policy, ThemeMode } from '../policy/policy';
import { resolveThreshold } from '../policy/policy';

/** Результат решения по одной паре. */
export type SolveResult = {
    readonly pair: string;
    /** Исходный (идеальный) тон. */
    readonly idealTone: number;
    /** Выбранный тон, либо `null`, если решения нет. */
    readonly solvedTone: number | null;
    /** Достигнутый контраст. */
    readonly ratio: number;
    /** Требуемый порог. */
    readonly requiredRatio: number;
    /** Удалось ли решить автоматически. */
    readonly solved: boolean;
    /** Человекочитаемое пояснение для UI и паспорта. */
    readonly reason: string;
};

/**
 * Перебирает тона шкалы в порядке минимального отклонения от идеала.
 *
 * Для идеального тона 10 сначала пробуются 10, 5, 20, 0, 30 — то есть
 * визуально «ближайшие» к замыслу варианты. Это сохраняет иерархию:
 * тёмный текст не превращается в чёрный, если хватает графитового.
 *
 * @returns порядок тонов: индекс 0 — самый близкий к идеалу
 */
export function toneSearchOrder(idealTone: number, availableTones: number[]): number[] {
    const unique = [...new Set(availableTones)];

    return unique
        .map((tone) => ({ tone, distance: Math.abs(tone - idealTone) }))
        .sort((a, b) => a.distance - b.distance || a.tone - b.tone)
        .map((item) => item.tone);
}


/**
 * Подбирает тон для пары, удовлетворяющий порогу политики.
 *
 * @param pair      описание пары из реестра
 * @param policy    активная политика
 * @param mode      режим темы
 * @param scale     тональный ряд, из которого выбирается тон
 * @param idealTone желаемый тон (базовая привязка семантики)
 * @param backdrop  подложка для прозрачного фона, если нужна
 *
 * @example
 * const result = solvePair(pair, policy, 'light-high', neutralScale, 10);
 * result.solved;     // true
 * result.solvedTone; // ближайший к 10 тон, прошедший порог
 */
export function solvePair(
    pair: PairDefinition,
    policy: Policy,
    mode: ThemeMode,
    scale: ToneScale,
    idealTone: number,
    backdrop?: string,
): SolveResult {
    const threshold = resolveThreshold(pair, policy, mode);
    const availableTones = Object.keys(scale).map(Number);
    const order = toneSearchOrder(idealTone, availableTones);

    let bestRatio = 0;

    for (const tone of order) {
        const fg = scale[tone];
        const bg = pair.requiresBackdrop ? backdrop : scale[idealTone];

        if (!fg || !bg) continue;

        // Прозрачная подложка проверяется только через композитинг:
        // WCAG не умеет работать с альфой напрямую.
        const ratio =
            pair.category === 'glass' && pair.requiresBackdrop
                ? getContrastRatio(fg, composite(bg, backdrop ?? bg).color)
                : getContrastRatio(fg, bg);

        if (ratio > bestRatio) bestRatio = ratio;

        if (ratio >= threshold.ratio - 1e-9) {
            return {
                pair: pair.key,
                idealTone,
                solvedTone: tone,
                ratio,
                requiredRatio: threshold.ratio,
                solved: true,
                reason:
                    tone === idealTone
                        ? 'Базовый тон проходит порог без корректировки.'
                        : `Тон сдвинут с ${idealTone} на ${tone} — минимальное изменение, проходящее порог.`,
            };
        }
    }

    return {
        pair: pair.key,
        idealTone,
        solvedTone: null,
        ratio: bestRatio,
        requiredRatio: threshold.ratio,
        solved: false,
        reason:
            `Достижимый максимум ${bestRatio.toFixed(2)}:1 при требуемых ` +
            `${threshold.ratio.toFixed(2)}:1. Требуется ручная проверка или изменение сид-цвета.`,
    };
}

/**
 * Автоисправление темы: прогоняет солвер по набору пар и возвращает
 * исправленные привязки тонов.
 *
 * @returns карта `имя токена -> тон`, содержащая только изменённые значения
 *
 * @see Docs/roadmap — Этап 4, шаг 3 «Fix automatically»
 */
export function autoFix(
    pairs: readonly PairDefinition[],
    policy: Policy,
    mode: ThemeMode,
    scale: ToneScale,
    idealTones: Record<string, number>,
    backdrop?: string,
): Record<string, number> {
    const fixes: Record<string, number> = {};

    for (const pair of pairs) {
        const ideal = idealTones[pair.foreground] ?? idealTones[pair.background];
        if (ideal === undefined) continue;

        const result = solvePair(pair, policy, mode, scale, ideal, backdrop);

        if (result.solved && result.solvedTone !== null && result.solvedTone !== ideal) {
            fixes[pair.foreground] = result.solvedTone;
        }
    }

    return fixes;
}

/**
 * Формулирует предупреждения о парах, которые невозможно исправить.
 *
 * @see Docs/roadmap — Этап 4, шаг 4
 */
export function collectWarnings(results: readonly SolveResult[]): string[] {
    return results
        .filter((result) => !result.solved)
        .map(
            (result) =>
                `Пара «${result.pair}» не может достичь порога ` +
                `${result.requiredRatio.toFixed(2)}:1. ${result.reason}`,
        );
}
