/**
 * Базовые типы цветовых пространств.
 *
 * Движки Chroma42 не зависят от внешних цветовых библиотек: все
 * преобразования считаются собственными формулами из спецификации W3C.
 *
 * @see Docs/Общая архитектура Chroma42.md — раздел 2 (Scale Engine)
 */

/** Линейный канал sRGB, диапазон [0..1] (без гамма-коррекции). */
export type LinearRgb = {
    readonly r: number;
    readonly g: number;
    readonly b: number;
};

/** sRGB с гаммой, каждый канал [0..255]. */
export type Rgb = {
    readonly r: number;
    readonly g: number;
    readonly b: number;
};

/** OKLab — перцептивно равномерное пространство без полюсаризации. */
export type Oklab = {
    readonly l: number;
    readonly a: number;
    readonly b: number;
};

/**
 * OKLCH — цилиндрическая форма OKLab.
 *
 * - `l`  — светлота, [0..1]
 * - `c`  — хроматичность, теоретически [0..~0.4]
 * - `h`  — оттёнок, градусы [0..360). Для ахроматических цветов = 0.
 */
export type Oklch = {
    readonly l: number;
    readonly c: number;
    readonly h: number;
};

/** Цвет с альфа-каналом [0..1] — то, что хранится в токенах. */
export type Rgba = Rgb & {
    readonly alpha: number;
};

/** Ссылка на примитив тонального ряда: `{neutral.10}`. */
export type PrimitiveRef = string;

/** Ссылка на другой семантический токен: `{surface.glass.fallback}`. */
export type SemanticRef = string;
