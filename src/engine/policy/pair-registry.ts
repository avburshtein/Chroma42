/**
 * Движок 3: реестр цветовых пар (Pair Registry).
 *
 * Ключевой принцип методологии Chroma42: проверяется не цвет, а ПАРА
 * в конкретном контексте. Реестр — это и есть методологическая база в коде.
 *
 * @see Docs/Chroma42 Color Pair Methodology.md — раздел 3, 4, 5
 * @see Docs/roadmap/Роадмап с учётом всех запланированных фич.md — Этап 3
 */

import type { PairContext, WcagLevel } from '../contrast/contrast';

/** Категория пары — определяет, к какой группе токенов она относится. */
export type PairCategory =
    | 'text'
    | 'container'
    | 'status'
    | 'form'
    | 'focus'
    | 'glass';

/** Важность пары для аудита. */
export type PairImportance = 'required' | 'recommended' | 'informational';

/**
 * Уровень уверенности проверки.
 *
 * Введён, чтобы инструмент не обещал лишнего (раздел 8 методологии).
 *
 * @see Docs/Chroma42 Color Pair Methodology.md — раздел 8
 */
export type ConfidenceLevel =
    /** Сплошные цвета, контраст >= порога. */
    | 'verified'
    /** Проверено с учётом обязательной подложки. */
    | 'verified-with-backdrop'
    /** Работает только при соблюдении указанных условий. */
    | 'conditional'
    /** Инструмент не может гарантировать результат. */
    | 'requires-manual-review';

/** Описание одной проверяемой пары токенов. */
export type PairDefinition = {
    /** Уникальный ключ пары, например `on-surface/surface`. */
    readonly key: string;
    /** Токен переднего плана (цвет текста/иконки). */
    readonly foreground: string;
    /** Токен подложки. */
    readonly background: string;
    /** Категория пары. */
    readonly category: PairCategory;
    /** Контекст использования -> определяет порог. */
    readonly context: PairContext;
    /** Важность для аудита. */
    readonly importance: PairImportance;
    /**
     * Обязательная подложка для прозрачного фона.
     * Заполняется для glass-пар: без неё проверка невозможна.
     */
    readonly requiresBackdrop?: string;
    /** Комментарий для документации и паспорта. */
    readonly note?: string;
};

/** Порог для пары с учётом контекста и уровня. */
export type PairThreshold = {
    readonly ratio: number;
    readonly level: WcagLevel;
};
