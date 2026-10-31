/**
 * Движок 7: экспорт темы в Tailwind v4.
 *
 * Выдаёт три артефакта:
 *  - `tokens.css`    — CSS-переменные `--c42-*` по всем 8 режимам, переключение
 *                      через атрибут `data-theme`;
 *  - `tailwind.css`  — статический маппинг `@theme inline` + вариант `dark`,
 *                      подключается один раз и не пересоздаётся;
 *  - `passport.json` — паспорт проверки: какие пары прошли, с каким контрастом.
 *
 * Экспорт блокируется, если обязательные пары не прошли аудит
 * (`audit.summary.exportAllowed === false`) — это шлюз политики.
 *
 * @see Docs/Общая архитектура Chroma42.md — раздел 8 (экспорт)
 * @see Docs/roadmap/Роадмап с учётом всех запланированных фич.md — Этап 6
 */

import { formatHex, parseColor } from '../color/parse';
import type { ToneScale } from '../scale/scale-engine';
import type { TokenMap } from '../audit/audit';
import { buildPassport } from '../audit/audit';
import { THEME_MODES, type ThemeMode } from '../policy/policy';
import type { ChromaTheme, Primitives, SemanticValue } from '../../model/theme';

// ---------------------------------------------------------------------------
// Артефакты и ошибки
// ---------------------------------------------------------------------------

/** Один файл экспорта. */
export type ExportArtifact = {
    /** Имя файла: `tokens.css`, `tailwind.css`, `passport.json`. */
    readonly name: string;
    /** Полное содержимое файла. */
    readonly content: string;
};

/** Результат экспорта — набор файлов для записи на диск. */
export type ExportResult = {
    readonly files: readonly ExportArtifact[];
};

/**
 * Ошибка блокировки экспорта: обязательные пары не прошли аудит.
 *
 * Это осознанное поведение — «экспортируются не палитры, а проверенные пары».
 */
export class ExportBlockedError extends Error {
    /** Ключи обязательных пар, не прошедших проверку. */
    readonly failedPairs: readonly string[];

    constructor(theme: ChromaTheme) {
        const failed = theme.audit.checks.filter(
            (c) => c.status === 'fail' && c.importance === 'required',
        );
        const details = failed
            .map(
                (c) =>
                    `  ${c.pair} [${c.mode}]: ${c.actualRatio.toFixed(2)}:1 ` +
                    `при требуемых ${c.requiredRatio.toFixed(2)}:1`,
            )
            .join('\n');

        super(
            `Экспорт заблокирован политикой «${theme.meta.policy}»: ` +
                `${failed.length} обязательных пар не прошли аудит.\n${details}`,
        );
        this.name = 'ExportBlockedError';
        this.failedPairs = failed.map((c) => c.pair);
    }
}

// ---------------------------------------------------------------------------
// Разрешение токенов
// ---------------------------------------------------------------------------

/** Ссылка на примитив: `{neutral.10}`. */
const REF_PATTERN = /^\{([A-Za-z-]+)\.(\d+)\}$/;

/**
 * Разрешает семантическое значение в итоговый HEX.
 *
 * Ссылка `{neutral.10}` ищется в примитивных шкалах темы; прямое значение
 * (`#rrggbb`, `rgb()`, `oklch()`) парсится как цвет. Альфа-канал применяется
 * поверх: при alpha < 1 получается `#rrggbbaa`.
 *
 * @throws если ссылка указывает на неизвестную шкалу или отсутствующий тон.
 */
export function resolveTokenValue(
    value: SemanticValue,
    primitives: Primitives,
): string {
    const ref = REF_PATTERN.exec(value.value);

    if (ref) {
        const [, scaleName, toneRaw] = ref;
        const scale = (primitives as Record<string, ToneScale | undefined>)[scaleName];

        if (!scale) {
            throw new Error(
                `Chroma42 export: неизвестная примитивная шкала «${scaleName}» ` +
                    `(значение ${value.value}).`,
            );
        }
        const hex = scale[Number(toneRaw)];
        if (!hex) {
            throw new Error(
                `Chroma42 export: тон ${toneRaw} отсутствует в шкале «${scaleName}».`,
            );
        }
        return withAlpha(hex, value.alpha);
    }

    const parsed = parseColor(value.value);
    if (!parsed) {
        throw new Error(
            `Chroma42 export: значение не распознано как ссылка или цвет: ` +
                `${value.value}`,
        );
    }
    return formatHex({ ...parsed, alpha: value.alpha });
}

/** Применяет альфа-канал к HEX: alpha < 1 даёт `#rrggbbaa`. */
function withAlpha(hex: string, alpha: number): string {
    if (alpha >= 1) return hex;
    const parsed = parseColor(hex);
    if (!parsed) return hex;
    return formatHex({ ...parsed, alpha });
}


// ---------------------------------------------------------------------------
// Уплощение режимов
// ---------------------------------------------------------------------------

/**
 * «Плющит» тему в карту `режим -> { токен -> HEX }`.
 *
 * Это то же представление, которое использует аудит, поэтому экспортёр
 * и паспорт всегда работают с одинаковыми значениями.
 */
export function flattenModes(
    theme: Pick<ChromaTheme, 'modes' | 'primitives'>,
): Record<ThemeMode, TokenMap> {
    const result = {} as Record<ThemeMode, TokenMap>;

    for (const mode of THEME_MODES) {
        const semantics = theme.modes[mode];
        if (!semantics) continue;

        const tokens: TokenMap = {};
        for (const [name, value] of Object.entries(semantics)) {
            tokens[name] = resolveTokenValue(value, theme.primitives);
        }
        result[mode] = tokens;
    }
    return result;
}

/** Объединённый отсортированный список имён токенов по всем режимам. */
function tokenNamesOf(flat: Record<ThemeMode, TokenMap>): string[] {
    const names = new Set<string>();
    for (const mode of THEME_MODES) {
        for (const name of Object.keys(flat[mode] ?? {})) {
            names.add(name);
        }
    }
    return [...names].sort();
}

// ---------------------------------------------------------------------------
// Генерация CSS
// ---------------------------------------------------------------------------

/** Многострочный заголовок-паспорт в начале файла. */
function fileHeader(theme: ChromaTheme, title: string, extra?: string): string[] {
    const s = theme.audit.summary;
    const lines = [
        `/* Chroma42 — ${title}`,
        ' * Сгенерировано автоматически. Не редактируйте вручную.',
        ` * Тема: ${theme.meta.name} | Политика: ${theme.meta.policy}`,
        ` * Движок: ${theme.meta.engine} v${theme.meta.engineVersion} | ` +
            `Методология: v${theme.meta.methodologyVersion}`,
        ` * Создано: ${theme.meta.createdAt}`,
        ` * Проверено пар: ${s.totalPairsChecked} | Пройдено: ${s.passed} | ` +
            `Провалено: ${s.failed} | Предупреждений: ${s.warnings}`,
    ];

    if (extra) lines.push(` * ${extra}`);
    lines.push(' */');
    return lines;
}

/**
 * Генерирует `tokens.css`: CSS-переменные `--c42-*` для всех режимов.
 *
 * Режимы переключаются атрибутом `data-theme="..."`; `:root` содержит
 * значения режима по умолчанию (`light-normal`).
 */
export function generateTokensCss(theme: ChromaTheme): string {
    const flat = flattenModes(theme);
    const tokenNames = tokenNamesOf(flat);
    const modesInOrder = THEME_MODES.filter((mode) => flat[mode] !== undefined);

    const lines = fileHeader(
        theme,
        'tokens.css',
        'Семантические токены по 8 режимам. Переключение: data-theme="..."',
    );
    lines.push('');

    modesInOrder.forEach((mode, index) => {
        const selector =
            mode === 'light-normal'
                ? ':root,\n[data-theme="light-normal"]'
                : `[data-theme="${mode}"]`;

        lines.push(`${selector} {`);
        for (const token of tokenNames) {
            const value = flat[mode][token];
            if (value === undefined) continue;
            lines.push(`    --c42-${token}: ${value};`);
        }
        lines.push('}');
        if (index < modesInOrder.length - 1) lines.push('');
    });

    return `${lines.join('\n')}\n`;
}

/**
 * Генерирует `tailwind.css`: статический маппинг на Tailwind v4.
 *
 * Блок `@theme inline` привязывает утилиты Tailwind (`bg-surface`,
 * `text-on-surface`, `border-outline`, …) к нашим переменным `--c42-*`,
 * поэтому переключение режима не требует пересборки утилит.
 */
export function generateTailwindPreset(theme: ChromaTheme): string {
    const flat = flattenModes(theme);
    const tokenNames = tokenNamesOf(flat);

    const lines = [
        ...fileHeader(
            theme,
            'tailwind.css',
            'Статический маппинг на Tailwind v4. Подключается один раз.',
        ),
        '',
        '/* Режимы: data-theme="light-normal" | "light-medium" | "light-high" |',
        ' * "light-reduced-transparency" | "dark-normal" | "dark-medium" |',
        ' * "dark-high" | "dark-reduced-transparency". */',
        '@custom-variant dark (&:where([data-theme^="dark"], [data-theme^="dark"] *));',
        '',
        '@theme inline {',
    ];

    for (const token of tokenNames) {
        lines.push(`    --color-${token}: var(--c42-${token});`);
    }
    lines.push('}');

    return `${lines.join('\n')}\n`;
}

// ---------------------------------------------------------------------------
// Паспорт и основной шлюз
// ---------------------------------------------------------------------------

/**
 * Генерирует `passport.json` — паспорт проверки темы.
 *
 * @param generatedAt необязательная метка времени (ISO); по умолчанию — сейчас.
 */
export function generatePassportJson(
    theme: ChromaTheme,
    generatedAt: string = new Date().toISOString(),
): string {
    const passport = buildPassport(theme.audit, theme.meta.policy, generatedAt);
    return `${JSON.stringify(passport, null, 4)}\n`;
}

/**
 * Главный шлюз экспорта: проверяет аудит и собирает файлы.
 *
 * @throws `ExportBlockedError`, если обязательные пары не прошли аудит.
 */
export function exportTailwindTheme(theme: ChromaTheme): ExportResult {
    if (!theme.audit.summary.exportAllowed) {
        throw new ExportBlockedError(theme);
    }

    return {
        files: [
            { name: 'tokens.css', content: generateTokensCss(theme) },
            { name: 'tailwind.css', content: generateTailwindPreset(theme) },
            { name: 'passport.json', content: generatePassportJson(theme) },
        ],
    };
}
