/**
 * Политики доступности Chroma42.
 *
 * Политика — набор порогов, по которым проверяются пары. Пресеты
 * соответствуют профилям из методологии: standard-AA/AAA и gov-AA/AAA.
 *
 * Строгий профиль дополнительно включает режим `high-contrast`, где
 * требования к фокусу и UI-элементам ужесточаются до 4.5:1.
 *
 * @see Docs/Chroma42 Color Pair Methodology.md — раздел 7
 * @see Docs/roadmap — Этап 0, шаг 5; Этап 3, шаг 3
 */

import type { PairContext, WcagLevel } from '../contrast/contrast';
import { WCAG_THRESHOLDS } from '../contrast/contrast';
import type { PairDefinition } from './pair-registry';

/** Идентификатор политики. */
export type PolicyId =
    | 'standard-aa'
    | 'standard-aaa'
    | 'gov-aa'
    | 'gov-aaa'
    | 'gov-high-contrast'
    | 'reduced-transparency';

/** Режим темы, к которому применяется политика. */
export type ThemeMode =
    | 'light-normal'
    | 'light-medium'
    | 'light-high'
    | 'dark-normal'
    | 'dark-medium'
    | 'dark-high';

/** Порог для конкретной пары в рамках политики. */
export type ResolvedThreshold = {
    readonly ratio: number;
    readonly level: WcagLevel;
    /** Запас сверх базового порога (для medium/high контраста). */
    readonly margin: number;
};

/** Описание политики. */
export type Policy = {
    readonly id: PolicyId;
    readonly name: string;
    readonly description: string;
    /** Целевой уровень WCAG. */
    readonly level: WcagLevel;
    /** Стандарты, на которые опирается профиль. */
    readonly standards: readonly string[];
    /** Множитель запаса контраста для medium-режимов. */
    readonly mediumMargin: number;
    /** Множитель запаса для high-contrast режима. */
    readonly highMargin: number;
    /** Блокировать экспорт при провале обязательных пар. */
    readonly strict: boolean;
};

/** Версия политики — попадает в паспорт темы. */
export const POLICY_VERSION = '1.0.0';

/** Контексты, для которых в строгом режиме действует «пол» 4.5:1. */
const NON_TEXT_CONTEXTS: readonly PairContext[] = [
    'ui-component',
    'focus-indicator',
    'icon',
];

/**
 * Каталог политик.
 *
 * ГОСТ Р 52872-2019 и EN 301 549 указаны как *ссылочные* стандарты:
 * инструмент не заявляет полного соответствия, а лишь учитывает
 * применимые требования в части цветового контраста.
 */
export const POLICIES: Record<PolicyId, Policy> = {
    'standard-aa': {
        id: 'standard-aa',
        name: 'Стандартный AA',
        description: 'Базовый целевой стандарт WCAG 2.2 AA.',
        level: 'AA',
        standards: ['WCAG 2.2 AA'],
        mediumMargin: 1.25,
        highMargin: 1.55,
        strict: false,
    },
    'standard-aaa': {
        id: 'standard-aaa',
        name: 'Стандартный AAA',
        description: 'Строгий профиль WCAG 2.2 AAA для всего текста.',
        level: 'AAA',
        standards: ['WCAG 2.2 AAA'],
        mediumMargin: 1.1,
        highMargin: 1.3,
        strict: true,
    },
    'gov-aa': {
        id: 'gov-aa',
        name: 'Государственный AA',
        description:
            'WCAG 2.2 AA с учётом применимых требований ГОСТ Р 52872-2019 ' +
            'и EN 301 549 в части цветового контраста.',
        level: 'AA',
        standards: [
            'WCAG 2.2 AA',
            'EN 301 549 (reference)',
            'ГОСТ Р 52872-2019 (reference, color aspects)',
        ],
        mediumMargin: 1.3,
        highMargin: 1.6,
        strict: true,
    },
    'gov-aaa': {
        id: 'gov-aaa',
        name: 'Государственный AAA',
        description:
            'WCAG 2.2 AAA с усиленными требованиями к фокусу и UI-элементам ' +
            '(минимум 4.5:1).',
        level: 'AAA',
        standards: [
            'WCAG 2.2 AAA',
            'EN 301 549 (reference)',
            'ГОСТ Р 52872-2019 (reference, color aspects)',
        ],
        mediumMargin: 1.15,
        highMargin: 1.35,
        strict: true,
    },
    'gov-high-contrast': {
        id: 'gov-high-contrast',
        name: 'Государственный (строгий контраст)',
        description:
            'Текст — минимум 7:1, фокус и UI-элементы — минимум 4.5:1. ' +
            'Экспорт блокируется при непройденных обязательных парах.',
        level: 'AAA',
        standards: [
            'WCAG 2.2 AAA',
            'EN 301 549 (reference)',
            'ГОСТ Р 52872-2019 (reference, color aspects)',
        ],
        mediumMargin: 1.2,
        highMargin: 1.45,
        strict: true,
    },
    'reduced-transparency': {
        id: 'reduced-transparency',
        name: 'Сниженная прозрачность',
        description:
            'Все прозрачные токены заменяются непрозрачными фолбэками, ' +
            'размытие отключается.',
        level: 'AA',
        standards: ['WCAG 2.2 AA', 'prefers-reduced-transparency'],
        mediumMargin: 1.25,
        highMargin: 1.55,
        strict: true,
    },
};

/** Возвращает политику по идентификатору. */
export function getPolicy(id: PolicyId): Policy {
    return POLICIES[id];
}

/**
 * Вычисляет порог для пары в конкретном режиме.
 *
 * 1. Берём базовый порог из таблицы WCAG для контекста и уровня политики.
 * 2. Для medium-режима умножаем на `mediumMargin`.
 * 3. Для high-режима — на `highMargin`, но не ниже «пола» 4.5:1 для
 *    нетекстовых контекстов (фокус, границы, иконки).
 *
 * @see Docs/Chroma42 Color Pair Methodology.md — раздел 7 «Правила режимов»
 */
export function resolveThreshold(
    pair: PairDefinition,
    policy: Policy,
    mode: ThemeMode,
): ResolvedThreshold {
    const base = WCAG_THRESHOLDS[pair.context][policy.level];

    const isHigh = mode.endsWith('-high');
    const isMedium = mode.endsWith('-medium');
    const highFloor = NON_TEXT_CONTEXTS.includes(pair.context) ? 4.5 : 0;

    let ratio = base;
    if (isHigh) {
        ratio = Math.max(base * policy.highMargin, highFloor);
    } else if (isMedium) {
        ratio = base * policy.mediumMargin;
    }

    return {
        ratio,
        level: policy.level,
        margin: isHigh || isMedium ? ratio - base : 0,
    };
}

/** Все идентификаторы политик — для UI-переключателя. */
export const POLICY_IDS = Object.keys(POLICIES) as PolicyId[];

/** Все режимы темы — для UI-переключателя и генераторов экспорта. */
export const THEME_MODES: readonly ThemeMode[] = [
    'light-normal',
    'light-medium',
    'light-high',
    'dark-normal',
    'dark-medium',
    'dark-high',
];

/** Базовая схема режима: `light-high` -> `light`. */
export function modeScheme(mode: ThemeMode): 'light' | 'dark' {
    return mode.startsWith('dark') ? 'dark' : 'light';
}
