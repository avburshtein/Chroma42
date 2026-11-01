/**
 * Движок 1.5 (часть 2): детерминированная кластеризация k-means в OKLab.
 *
 * Извлекает до 5 кандидатов на primary-сид из пиксельного массива
 * референсного изображения. Обработка целиком на стороне клиента:
 * движок принимает только пиксели, декодирование картинки остаётся
 * в UI-слое (canvas → ImageData → downsamplePixels).
 *
 * Ключевые свойства (по спецификации этапа 12.2):
 *   - детерминизм: никаких `Math.random` — одна картинка → одни кандидаты;
 *   - инициализация по перцентилям светлот (детерминированный k-means++);
 *   - фиксированное число итераций с ранним выходом при стабилизации;
 *   - дистанция в OKLab, постобработка (мерж, ранжирование) в OKLCH;
 *   - отсев почти серых (хрома < порога) и экстремальных светлот;
 *   - мерж кластеров при Δhue < 15° и близкой хроматичности;
 *   - fallback: монохромная картинка не даёт пустого списка.
 *
 * @see Docs/roadmap/Роадмап с учётом всех запланированных фич.md — Этап 12.2
 */

import {
    oklabToOklch,
    oklchToOklab,
    oklchToRgbSafe,
    rgbToOklch,
} from '../color/convert';
import { formatHex } from '../color/parse';
import type { Oklab, Oklch, Rgb } from '../color/types';

// ---------------------------------------------------------------------------
// Типы
// ---------------------------------------------------------------------------

/** Кандидат на primary-сид, извлечённый из кластера пикселей. */
export type SeedCandidate = {
    /** Кандидат в HEX (`#rrggbb`). */
    readonly hex: string;
    /** Доля пикселей кластера от общего числа, 0..1. */
    readonly weight: number;
    /** Хроматичность кластера в OKLCH. */
    readonly chroma: number;
    /** Оттёнок кластера в OKLCH, градусы [0..360). */
    readonly hue: number;
};

/** Настройки извлечения кандидатов. */
export type ExtractSeedCandidatesOptions = {
    /** Максимум кандидатов в результате. По умолчанию 5. */
    readonly maxCandidates?: number;
    /** Порог хроматичности для отсева почти серых. По умолчанию 0.03. */
    readonly chromaThreshold?: number;
    /** Число кластеров k-means. По умолчанию 8. */
    readonly clusters?: number;
    /** Максимум итераций k-means. По умолчанию 24. */
    readonly maxIterations?: number;
    /** Отступ светлоты от полюсов для отсева экстремумов. По умолчанию 0.05. */
    readonly lightnessMargin?: number;
};

// ---------------------------------------------------------------------------
// Даунсэмплинг
// ---------------------------------------------------------------------------

/**
 * Понижает разрешение RGBA-буфера боксированием (box sampling).
 *
 * Кластеризация 4 Мпикселей — трата CPU: перед вызовом
 * `extractSeedCandidates` картинка ужимается до ~64×64 (4096 точек).
 * Блоки, целиком состоящие из прозрачных пикселей (альфа < 128),
 * пропускаются: прозрачный фон не должен попадать в кластеры цвета.
 *
 * @param data       плоский RGBA-буфер (например, `ImageData.data`)
 * @param width      ширина исходного изображения
 * @param height     высота исходного изображения
 * @param targetSize максимальная сторона результата. По умолчанию 64.
 * @returns пиксели уменьшенного изображения
 */
export function downsamplePixels(
    data: Uint8ClampedArray | readonly number[],
    width: number,
    height: number,
    targetSize = 64,
): readonly Rgb[] {
    if (width <= 0 || height <= 0) return [];

    const scale = Math.min(1, targetSize / Math.max(width, height));
    const ow = Math.max(1, Math.round(width * scale));
    const oh = Math.max(1, Math.round(height * scale));
    const scaleX = width / ow;
    const scaleY = height / oh;

    const pixels: Rgb[] = [];

    for (let oy = 0; oy < oh; oy++) {
        const y0 = Math.floor(oy * scaleY);
        const y1 = Math.max(y0 + 1, Math.floor((oy + 1) * scaleY));

        for (let ox = 0; ox < ow; ox++) {
            const x0 = Math.floor(ox * scaleX);
            const x1 = Math.max(x0 + 1, Math.floor((ox + 1) * scaleX));

            let r = 0;
            let g = 0;
            let b = 0;
            let count = 0;

            for (let y = y0; y < y1; y++) {
                for (let x = x0; x < x1; x++) {
                    const i = (y * width + x) * 4;
                    if (data[i + 3] < 128) continue;
                    r += data[i];
                    g += data[i + 1];
                    b += data[i + 2];
                    count++;
                }
            }

            if (count > 0) {
                pixels.push({
                    r: Math.round(r / count),
                    g: Math.round(g / count),
                    b: Math.round(b / count),
                });
            }
        }
    }

    return pixels;
}

// ---------------------------------------------------------------------------
// Кластеризация
// ---------------------------------------------------------------------------

/** Внутреннее представление пикселя: OKLCH для фильтров, OKLab для дистанции. */
type Sample = {
    readonly oklch: Oklch;
    readonly oklab: Oklab;
};

/** Внутренняя статистика кластера после сходимости. */
type ClusterStat = {
    oklch: Oklch;
    count: number;
};

/** Евклидова дистанция в OKLab, в квадрате — без sqrt. */
function distSq(a: Oklab, b: Oklab): number {
    const dl = a.l - b.l;
    const da = a.a - b.a;
    const db = a.b - b.b;
    return dl * dl + da * da + db * db;
}

/** Кратчайшая разница оттёнков по кругу, градусы [0..180]. */
function hueDelta(a: number, b: number): number {
    const diff = Math.abs(a - b) % 360;
    return Math.min(diff, 360 - diff);
}

/** Усредняет пиксели кластера: среднее по l, a, b, затем обратно в OKLCH. */
function clusterMean(samples: readonly Sample[]): Oklch {
    let l = 0;
    let a = 0;
    let b = 0;
    for (const s of samples) {
        l += s.oklab.l;
        a += s.oklab.a;
        b += s.oklab.b;
    }
    return oklabToOklch({
        l: l / samples.length,
        a: a / samples.length,
        b: b / samples.length,
    });
}

/** Порог мержа кластеров по оттёнку, градусы. */
const MERGE_HUE_DELTA = 15;

/** Порог мержа кластеров по хроматичности. */
const MERGE_CHROMA_DELTA = 0.05;

// Разбиение по кластерам выполняется в extractSeedCandidates (шаги 1–7 ниже).

// ---------------------------------------------------------------------------
// Извлечение кандидатов
// ---------------------------------------------------------------------------

/**
 * Извлекает кандидатов на primary-сид из пикселей изображения.
 *
 * Пайплайн:
 * 1. пиксели → OKLCH/OKLab;
 * 2. отсев почти серых (хрома < порога) и экстремальных светлот;
 * 3. детерминированная инициализация центроидов по перцентилям светлот;
 * 4. цикл k-means (дистанция в OKLab) с ранним выходом при стабилизации;
 * 5. статистика кластеров — векторное среднее в OKLab, назад в OKLCH;
 * 6. мерж кластеров при Δhue < 15° и близкой хроматичности;
 * 7. ранжирование score = weight × chroma и отбор топ-`maxCandidates`.
 *
 * Для монохромных картинок отсев отключается (fallback), ранжирование
 * идёт по весу кластера: отсев серых не должен вернуть пустой список.
 *
 * @param pixels  пиксели изображения (обычно после `downsamplePixels`)
 * @param options настройки порогов и числа кластеров
 * @returns кандидаты, отсортированные по убыванию «вес × хрома»
 *
 * @example
 * const candidates = extractSeedCandidates(downsamplePixels(data, w, h));
 * candidates[0].hex; // самый вероятный primary-сид
 */
export function extractSeedCandidates(
    pixels: readonly Rgb[],
    options: ExtractSeedCandidatesOptions = {},
): readonly SeedCandidate[] {
    const {
        maxCandidates = 5,
        chromaThreshold = 0.03,
        clusters: k = 8,
        maxIterations = 24,
        lightnessMargin = 0.05,
    } = options;

    if (pixels.length === 0) return [];

    // 1. Пиксели -> OKLCH/OKLab.
    const all: Sample[] = pixels.map((rgb) => {
        const oklch = rgbToOklch(rgb);
        return { oklch, oklab: oklchToOklab(oklch) };
    });

    // 2. Отсев почти серых и экстремальных светлот.
    let pool = all.filter(
        (s) =>
            s.oklch.c >= chromaThreshold &&
            s.oklch.l > lightnessMargin &&
            s.oklch.l < 1 - lightnessMargin,
    );

    // Fallback: монохромная картинка — работаем со всеми пикселями.
    const monochrome = pool.length === 0;
    if (monochrome) pool = all;

    // 3. Детерминированная инициализация: центроиды на перцентилях светлот.
    const sorted = [...pool].sort((a, b) => a.oklch.l - b.oklch.l);
    const kk = Math.max(1, Math.min(k, sorted.length));
    const centroids: Oklab[] = [];
    for (let i = 0; i < kk; i++) {
        const t = (i + 0.5) / kk;
        const idx = Math.min(
            sorted.length - 1,
            Math.round(t * (sorted.length - 1)),
        );
        centroids.push({ ...sorted[idx].oklab });
    }

    // 4. Цикл k-means: назначение -> пересчёт центроид.
    const assignments = new Array<number>(pool.length).fill(-1);
    for (let iter = 0; iter < maxIterations; iter++) {
        let changed = false;

        for (let i = 0; i < pool.length; i++) {
            let best = 0;
            let bestDist = Infinity;
            for (let c = 0; c < kk; c++) {
                const d = distSq(pool[i].oklab, centroids[c]);
                if (d < bestDist) {
                    bestDist = d;
                    best = c;
                }
            }
            if (assignments[i] !== best) {
                assignments[i] = best;
                changed = true;
            }
        }

        // Пересчёт центроид; пустой кластер сохраняет прежний центроид.
        const sums = Array.from({ length: kk }, () => ({
            l: 0,
            a: 0,
            b: 0,
            n: 0,
        }));
        for (let i = 0; i < pool.length; i++) {
            const c = assignments[i];
            const s = pool[i].oklab;
            sums[c].l += s.l;
            sums[c].a += s.a;
            sums[c].b += s.b;
            sums[c].n++;
        }
        for (let c = 0; c < kk; c++) {
            if (sums[c].n > 0) {
                centroids[c] = {
                    l: sums[c].l / sums[c].n,
                    a: sums[c].a / sums[c].n,
                    b: sums[c].b / sums[c].n,
                };
            }
        }

        if (!changed) break;
    }

    // 5. Статистика кластеров: векторное среднее в OKLab -> OKLCH.
    const buckets: Sample[][] = Array.from({ length: kk }, () => []);
    for (let i = 0; i < pool.length; i++) {
        buckets[assignments[i]].push(pool[i]);
    }

    const stats: ClusterStat[] = [];
    for (const bucket of buckets) {
        if (bucket.length === 0) continue;
        stats.push({ oklch: clusterMean(bucket), count: bucket.length });
    }

    // 6. Мерж близких кластеров (для монохромных картинок оттёнок серых
    //    не стабилен — мерж не применяется).
    const merged: ClusterStat[] = [];

    if (monochrome) {
        for (const s of stats) {
            merged.push({ oklch: { ...s.oklch }, count: s.count });
        }
    } else {
        const ordered = [...stats].sort((a, b) => b.count - a.count);

        for (const stat of ordered) {
            let target: ClusterStat | undefined;

            for (const m of merged) {
                if (
                    hueDelta(m.oklch.h, stat.oklch.h) < MERGE_HUE_DELTA &&
                    Math.abs(m.oklch.c - stat.oklch.c) < MERGE_CHROMA_DELTA
                ) {
                    target = m;
                    break;
                }
            }

            if (target) {
                // Взвешенное среднее по числу пикселей обоих кластеров.
                const total = target.count + stat.count;
                const w1 = target.count / total;
                const w2 = stat.count / total;
                const lab1 = oklchToOklab(target.oklch);
                const lab2 = oklchToOklab(stat.oklch);
                target.oklch = oklabToOklch({
                    l: lab1.l * w1 + lab2.l * w2,
                    a: lab1.a * w1 + lab2.a * w2,
                    b: lab1.b * w1 + lab2.b * w2,
                });
                target.count = total;
            } else {
                merged.push({ oklch: { ...stat.oklch }, count: stat.count });
            }
        }
    }

    // 7. Ранжирование: цветные — score = weight × chroma,
    //    монохромные — по весу (хрома у серых не информативна).
    const total = pool.length;

    return merged
        .map((m) => ({
            hex: formatHex({ ...oklchToRgbSafe(m.oklch), alpha: 1 }),
            weight: m.count / total,
            chroma: m.oklch.c,
            hue: m.oklch.h,
        }))
        .sort((a, b) =>
            monochrome
                ? b.weight - a.weight
                : b.weight * b.chroma - a.weight * a.chroma,
        )
        .slice(0, maxCandidates);
}
