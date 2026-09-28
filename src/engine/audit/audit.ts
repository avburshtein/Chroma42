/**
 * Движок 5: аудит и паспорт темы (Audit & Passport Engine).
 *
 * Каждый экспорт сопровождается техническим отчётом: какие пары проверялись,
 * с каким коэффициентом, каким статусом и на каком уровне уверенности.
 *
 * Юридический дисклеймер обязателен: инструмент подтверждает
 * математическое соответствие цветовых пар, но не является сертификатом
 * доступности всего цифрового продукта.
 *
 * @see Docs/Общая архитектура Chroma42.md — разделы 6, 7
 * @see Docs/Chroma42 Color Pair Methodology.md — раздел 9
 */

import { getContrastRatio, meetsThreshold, apcaLc } from '../contrast/contrast';
import { composite } from '../contrast/composite';
import { formatHex, parseColor } from '../color/parse';
import type { PairDefinition } from '../policy/pair-registry';
import type { Policy, ThemeMode } from '../policy/policy';
import { getPolicy, resolveThreshold } from '../policy/policy';
import type { AuditCheck, AuditReport, CheckStatus } from '../../model/theme';

/** Версия паспорта. */
export const PASSPORT_VERSION = '1.0';

/** Версия движка — попадает в паспорт. */
export const ENGINE_VERSION = 'chroma42-oklch-solver-1.0.0';

/** Версия методологии. */
/**
 * Версия методологии. Повышается при изменении определений, порогов
 * или правил проверки. Должна совпадать с версией в
 * `Docs/Chroma42 Color Pair Methodology.md`.
 */
export const METHODOLOGY_VERSION = '2.0.0';

/**
 * Юридический дисклеймер.
 *
 * Формулировка намеренно осторожная: заявляется математическая проверка
 * цветовых пар, а не юридическое соответствие продукта.
 *
 * @see Docs/Общая архитектура Chroma42.md — раздел 7
 * @see Docs/Chroma42 Color Pair Methodology.md — раздел 12
 */
export const LEGAL_DISCLAIMER =
    'Chroma42 обеспечивает математическую валидацию цветовых контрастов и генерацию ' +
    'фолбэков в соответствии с методологиями WCAG 2.2 и ссылочными требованиями ' +
    'EN 301 549 / ГОСТ Р 52872-2019. Итоговое соответствие цифрового продукта ' +
    'стандартам доступности зависит также от семантики HTML, клавиатурной навигации, ' +
    'ARIA-атрибутов и поведения компонентов, что находится вне зоны ответственности ' +
    'генератора токенов. Данный отчёт не является юридическим сертификатом доступности.';

/** Карта токен -> значение для конкретного режима. */
export type TokenMap = Record<string, string>;

/** Результат проверки одной пары. */
export type PairCheckResult = {
    readonly definition: PairDefinition;
    readonly check: AuditCheck;
};

/**
 * Проверяет одну пару токенов в указанном режиме.
 *
 * Для прозрачных фонов контраст считается от «запечённого» цвета: токен
 * накладывается на обязательную подложку через альфа-композитинг.
 *
 * @param definition описание пары из реестра
 * @param tokens     значения токенов режима
 * @param policy     активная политика
 * @param mode       режим темы
 */
export function checkPair(
    definition: PairDefinition,
    tokens: TokenMap,
    policy: Policy,
    mode: ThemeMode,
): PairCheckResult {
    const threshold = resolveThreshold(definition, policy, mode);

    const rawForeground = tokens[definition.foreground];
    const rawBackground = tokens[definition.background];

    // Отсутствующий токен — это ошибка данных, а не провал контраста.
    if (!rawForeground || !rawBackground) {
        return {
            definition,
            check: {
                pair: definition.key,
                mode,
                foregroundValue: rawForeground ?? '(отсутствует)',
                backgroundValue: rawBackground ?? '(отсутствует)',
                context: definition.context,
                requiredRatio: threshold.ratio,
                actualRatio: 0,
                status: 'fail',
                importance: definition.importance,
                confidence: 'requires-manual-review',
                notes: `Токен не найден в режиме ${mode}. Проверьте раскладку семантики.`,
            },
        };
    }

    // Прозрачный фон «запекается» на обязательной подложке.
    const backdrop = definition.requiresBackdrop
        ? tokens[definition.requiresBackdrop]
        : undefined;

    const effectiveBackground =
        backdrop && hasAlpha(rawBackground)
            ? formatHex({ ...composite(rawBackground, backdrop).color, alpha: 1 })
            : rawBackground;

    const ratio = getContrastRatio(rawForeground, effectiveBackground);
    const passes = meetsThreshold(ratio, definition.context, policy.level);

    // Уровень уверенности зависит от наличия прозрачности.
    const confidence = hasAlpha(rawBackground)
        ? backdrop
            ? 'verified-with-backdrop'
            : 'requires-manual-review'
        : 'verified';

    const status: CheckStatus = passes ? 'pass' : 'fail';

    return {
        definition,
        check: {
            pair: definition.key,
            mode,
            foregroundValue: canonical(rawForeground),
            backgroundValue: canonical(effectiveBackground),
            context: definition.context,
            requiredRatio: round(threshold.ratio),
            actualRatio: round(ratio),
            status,
            importance: definition.importance,
            confidence,
            apcaLc: round(apcaLc(rawForeground, effectiveBackground), 1),
            notes: buildNote(definition, backdrop, effectiveBackground),
        },
    };
}


/**
 * Проверяет все пары реестра для набора режимов и строит полный отчёт.
 *
 * @param pairs  пары для проверки (обычно REQUIRED_PAIRS)
 * @param modes  карта `режим -> значения токенов`
 * @param policy активная политика
 *
 * @see Docs/roadmap — Этап 10 «Паспорт темы и аудит»
 *
 * @example
 * const report = buildAuditReport(REQUIRED_PAIRS, modesByTheme, getPolicy('gov-aa'));
 * report.summary.exportAllowed; // true, если обязательные пары прошли
 */
export function buildAuditReport(
    pairs: readonly PairDefinition[],
    modes: Readonly<Record<string, TokenMap>>,
    policy: Policy,
): AuditReport {
    const checks: AuditCheck[] = [];
    const warnings: string[] = [];

    for (const mode of Object.keys(modes)) {
        const tokens = modes[mode];
        const themeMode = mode as ThemeMode;

        for (const definition of pairs) {
            const { check } = checkPair(definition, tokens, policy, themeMode);
            checks.push(check);

            if (check.status === 'fail' && check.importance === 'required') {
                warnings.push(
                    `Пара «${check.pair}» в режиме ${mode}: ` +
                        `${check.actualRatio}:1 при требуемых ${check.requiredRatio}:1.`,
                );
            }
        }
    }

    const passed = checks.filter((c) => c.status === 'pass').length;
    const failed = checks.filter((c) => c.status === 'fail').length;
    const failedRequired = checks.filter(
        (c) => c.status === 'fail' && c.importance === 'required',
    ).length;

    return {
        summary: {
            totalPairsChecked: checks.length,
            passed,
            warnings: warnings.length,
            failed,
            // В строгом режиме экспорт блокируется при провале обязательных пар.
            exportAllowed: !policy.strict || failedRequired === 0,
        },
        checks,
        warnings,
        legalDisclaimer: LEGAL_DISCLAIMER,
    };
}

/**
 * Формирует JSON-паспорт темы для экспорта.
 *
 * @see Docs/Общая архитектура Chroma42.md — раздел 6
 */
export function buildPassport(
    report: AuditReport,
    policyId: Policy['id'],
    generatedAt: string,
): Record<string, unknown> {
    return {
        passportVersion: PASSPORT_VERSION,
        generatedAt,
        tool: 'Chroma42 Custom Engine',
        engineVersion: ENGINE_VERSION,
        methodology: {
            name: 'Chroma42 Color Pair Methodology',
            version: METHODOLOGY_VERSION,
            policy: getPolicy(policyId),
            policyVersion: '1.0.0',
            colorSpace: 'OKLCH',
        },
        summary: report.summary,
        checks: report.checks,
        warnings: report.warnings,
        legalDisclaimer: report.legalDisclaimer,
    };
}

/** Формирует человекочитаемый отчёт в Markdown. */
export function buildMarkdownReport(report: AuditReport, policyName: string): string {
    const lines: string[] = [
        '# Паспорт доступности темы — Chroma42',
        '',
        `**Политика:** ${policyName}  `,
        `**Проверено пар:** ${report.summary.totalPairsChecked}  `,
        `**Пройдено:** ${report.summary.passed}  `,
        `**Предупреждений:** ${report.summary.warnings}  `,
        `**Ошибок:** ${report.summary.failed}`,
        '',
        `**Экспорт разрешён:** ${report.summary.exportAllowed ? 'да' : 'нет'}`,
        '',
        '## Проверки',
        '',
        '| Пара | Режим | Факт | Требуется | Статус |',
        '|---|---|---:|---:|---|',
    ];

    for (const check of report.checks) {
        const status = check.status === 'pass' ? '✅ PASS' : '❌ FAIL';
        lines.push(
            `| ${check.pair} | ${check.mode} | ${check.actualRatio}:1 | ` +
                `${check.requiredRatio}:1 | ${status} |`,
        );
    }

    if (report.warnings.length > 0) {
        lines.push('', '## Предупреждения', '');
        for (const warning of report.warnings) {
            lines.push(`- ${warning}`);
        }
    }

    lines.push('', '---', '', `_${report.legalDisclaimer}_`);

    return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Вспомогательное
// ---------------------------------------------------------------------------

/** Есть ли в цвете альфа-канал меньше 1. */
function hasAlpha(value: string): boolean {
    const parsed = parseColor(value);
    return parsed !== null && parsed.alpha < 1;
}

/** Приводит цвет к каноничному HEX для читаемости паспорта. */
function canonical(value: string): string {
    const parsed = parseColor(value);
    return parsed ? formatHex(parsed) : value;
}

/** Формирует примечание к проверке с учётом прозрачности. */
function buildNote(
    definition: PairDefinition,
    backdrop: string | undefined,
    effectiveBackground: string,
): string | undefined {
    if (definition.category !== 'glass') {
        return definition.note;
    }

    if (!backdrop) {
        return (
            'Прозрачный токен проверен без обязательной подложки. ' +
            'Для использования на других фонах требуется ручная проверка.'
        );
    }

    return (
        `Прозрачный токен «запечён» на подложке ${definition.requiresBackdrop} ` +
        `и дал эффективный цвет ${effectiveBackground}. ` +
        'Для использования на других фонах требуется ручная проверка.'
    );
}

function round(value: number, digits = 2): number {
    const f = 10 ** digits;
    return Math.round(value * f) / f;
}
