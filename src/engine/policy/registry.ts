/**
 * Реестр цветовых пар Chroma42 v1.
 *
 * Таблицы перенесены из методологии без изменения порогов; каждая пара
 * получает минимальный контраст и уровень важности.
 *
 * @see Docs/Chroma42 Color Pair Methodology.md — разделы 4.1–4.5
 */

import type { PairCategory, PairDefinition } from './pair-registry';

/**
 * Имена статусных шкал, участвующих в реестре пар.
 *
 * Объявлено до `PAIR_REGISTRY`, так как используется при его инициализации.
 */
export const STATUS_NAMES = ['success', 'warning', 'error', 'info'] as const;

/**
 * @example
 * const pairs = PAIR_REGISTRY;
 * pairs[0].context;  // 'text-normal'
 * pairs[0].importance; // 'required'
 */
export const PAIR_REGISTRY: readonly PairDefinition[] = [
    // --- 4.1 Текст ------------------------------------------------------
    {
        key: 'on-surface/surface',
        foreground: 'on-surface',
        background: 'surface',
        category: 'text',
        context: 'text-normal',
        importance: 'required',
        note: 'Основной текст на базовой поверхности.',
    },
    {
        key: 'on-surface/surface-container',
        foreground: 'on-surface',
        background: 'surface-container',
        category: 'container',
        context: 'text-normal',
        importance: 'required',
        note: 'Текст внутри контейнера.',
    },
    {
        key: 'on-surface-variant/surface',
        foreground: 'on-surface-variant',
        background: 'surface',
        category: 'text',
        context: 'text-normal',
        importance: 'required',
        note: 'Вторичный смысловой текст.',
    },
    {
        key: 'on-surface-variant/surface-container',
        foreground: 'on-surface-variant',
        background: 'surface-container',
        category: 'container',
        context: 'text-normal',
        importance: 'required',
        note: 'Вторичный текст в контейнере.',
    },
    {
        key: 'placeholder/surface',
        foreground: 'placeholder',
        background: 'surface',
        category: 'form',
        context: 'text-normal',
        importance: 'recommended',
        note: 'Placeholder проверяется, только если несёт смысл.',
    },
    {
        key: 'on-surface-muted/surface',
        foreground: 'on-surface-muted',
        background: 'surface',
        category: 'text',
        context: 'text-normal',
        importance: 'recommended',
        note: 'Приглушённый текст (подписи, метаданные).',
    },
    {
        key: 'disabled/surface',
        foreground: 'disabled',
        background: 'surface',
        category: 'text',
        context: 'text-normal',
        importance: 'informational',
        note: 'WCAG не требует контраста для disabled; проверяем для информирования.',
    },

    // --- 4.2 Акценты ----------------------------------------------------
    {
        key: 'on-primary/primary',
        foreground: 'on-primary',
        background: 'primary',
        category: 'container',
        context: 'text-normal',
        importance: 'required',
        note: 'Текст на основной кнопке.',
    },
    {
        key: 'on-primary-container/primary-container',
        foreground: 'on-primary-container',
        background: 'primary-container',
        category: 'container',
        context: 'text-normal',
        importance: 'required',
    },
    {
        key: 'on-secondary/secondary',
        foreground: 'on-secondary',
        background: 'secondary',
        category: 'container',
        context: 'text-normal',
        importance: 'required',
    },
    {
        key: 'on-secondary-container/secondary-container',
        foreground: 'on-secondary-container',
        background: 'secondary-container',
        category: 'container',
        context: 'text-normal',
        importance: 'required',
    },
    {
        key: 'on-tertiary/tertiary',
        foreground: 'on-tertiary',
        background: 'tertiary',
        category: 'container',
        context: 'text-normal',
        importance: 'required',
    },
    {
        key: 'on-tertiary-container/tertiary-container',
        foreground: 'on-tertiary-container',
        background: 'tertiary-container',
        category: 'container',
        context: 'text-normal',
        importance: 'required',
    },

    // --- 4.3 Статусы ----------------------------------------------------
    // Формируются программно: 4 статуса x 2 варианта = 8 пар.
    ...STATUS_NAMES.flatMap((status) => [
        {
            key: `on-${status}/${status}`,
            foreground: `on-${status}`,
            background: status,
            category: 'status' as const,
            context: 'text-normal' as const,
            importance: 'required' as const,
            note: `Текст на плашке статуса ${status}.`,
        },
        {
            key: `on-${status}-container/${status}-container`,
            foreground: `on-${status}-container`,
            background: `${status}-container`,
            category: 'status' as const,
            context: 'text-normal' as const,
            importance: 'required' as const,
            note: `Текст в контейнере статуса ${status}.`,
        },
    ]),

    // --- 4.4 Формы, фокус и стекло ---------------------------------------
    {
        key: 'outline/surface',
        foreground: 'outline',
        background: 'surface',
        category: 'form',
        context: 'ui-component',
        importance: 'required',
        note: 'Граница инпута, если она единственный признак поля.',
    },
    {
        key: 'border-strong/surface',
        foreground: 'border-strong',
        background: 'surface',
        category: 'form',
        context: 'ui-component',
        importance: 'required',
        note: 'Активная граница значимых компонентов.',
    },
    {
        key: 'focus-ring/surface',
        foreground: 'focus-ring',
        background: 'surface',
        category: 'focus',
        context: 'focus-indicator',
        importance: 'required',
        note: 'Индикатор фокуса на базовой поверхности.',
    },
    {
        key: 'focus-ring/primary',
        foreground: 'focus-ring',
        background: 'primary',
        category: 'focus',
        context: 'focus-indicator',
        importance: 'required',
        note: 'Индикатор фокуса поверх акцентного элемента.',
    },
    {
        key: 'on-surface/surface-container-high',
        foreground: 'on-surface',
        background: 'surface-container-high',
        category: 'container',
        context: 'text-normal',
        importance: 'required',
        note: 'Текст на приподнятой поверхности (карточки, меню).',
    },
    {
        key: 'outline/surface-container',
        foreground: 'outline',
        background: 'surface-container',
        category: 'form',
        context: 'ui-component',
        importance: 'recommended',
        note: 'Граница поля внутри контейнера.',
    },
    {
        key: 'on-surface-variant/surface-container-high',
        foreground: 'on-surface-variant',
        background: 'surface-container-high',
        category: 'container',
        context: 'text-normal',
        importance: 'recommended',
    },

    // --- 4.5 Прозрачные и стеклянные поверхности ------------------------
    {
        key: 'on-surface/surface-glass',
        foreground: 'on-surface',
        background: 'surface-glass',
        category: 'glass',
        context: 'text-normal',
        importance: 'required',
        requiresBackdrop: 'background',
        note: 'Текст на стекле; проверяется только через композитинг с обязательной подложкой.',
    },
    {
        key: 'outline/surface-glass',
        foreground: 'outline',
        background: 'surface-glass',
        category: 'glass',
        context: 'ui-component',
        importance: 'recommended',
        requiresBackdrop: 'background',
        note: 'Граница стеклянного элемента.',
    },
] as const;

/** Пары, которые обязаны пройти: блокируют экспорт в строгом режиме. */
export const REQUIRED_PAIRS: readonly PairDefinition[] = PAIR_REGISTRY.filter(
    (pair) => pair.importance === 'required',
);

/** Находит пару по ключу. */
export function findPair(key: string): PairDefinition | undefined {
    return PAIR_REGISTRY.find((pair) => pair.key === key);
}

/** Возвращает пары заданной категории. */
export function pairsByCategory(category: PairCategory): readonly PairDefinition[] {
    return PAIR_REGISTRY.filter((pair) => pair.category === category);
}
