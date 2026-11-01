'use client';

import { Fragment, useMemo, useState } from 'react';
import {
    buildMarkdownReport,
    generatePassportJson,
    generateTokensCss,
    exportTailwindTheme,
    ExportBlockedError,
    getPolicy,
    type ChromaTheme,
    type ThemeMode,
} from '@/engine';
import type { SolveResult } from '@/engine/solver/solver';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/cn';

/**
 * Аудит-панель (Этап 9) по guidelines/patterns/audit-panel.md:
 * строка на каждую пару каждого режима, индикация только ролями темы,
 * статус экспорта строго из audit.summary.exportAllowed, скачивание
 * отчётов и копирование tokens.css. Числа — из отчёта движка, UI не
 * пересчитывает контраст и не приукрашивает статусы.
 */

const STATUS_LABELS = {
    pass: 'Проходит',
    warning: 'Предупреждение',
    fail: 'Не проходит',
} as const;

const STATUS_ORDER = { fail: 0, warning: 1, pass: 2 } as const;

/** Индикация строк ролями темы: fail → error-container, warn → приглушение. */
const STATUS_STYLES = {
    pass: '',
    warning: 'opacity-75',
    fail: 'bg-[var(--c42-error-container)] text-[var(--c42-on-error-container)]',
} as const;

type AuditPanelProps = {
    readonly theme: ChromaTheme;
    readonly mode: ThemeMode;
    readonly solveResults: Readonly<Record<string, readonly SolveResult[]>>;
};

function download(name: string, content: string, mime = 'text/plain') {
    const blob = new Blob([content], { type: `${mime};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
}

export function AuditPanel({ theme, mode, solveResults }: AuditPanelProps) {
    const [showAllModes, setShowAllModes] = useState(false);
    const [exportError, setExportError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    const summary = theme.audit.summary;
    const policy = getPolicy(theme.meta.policy);

    // Сортировка: fail сверху, затем warnings, затем passes.
    // Фильтрация только в пользу видимости проблем: проблемы видны
    // всегда, passes других режимов — по переключателю.
    const rows = useMemo(() => {
        const sorted = [...theme.audit.checks].sort(
            (a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status],
        );
        return showAllModes
            ? sorted
            : sorted.filter((c) => c.mode === mode || c.status !== 'pass');
    }, [theme, mode, showAllModes]);

    const copyTokensCss = async () => {
        await navigator.clipboard.writeText(generateTokensCss(theme));
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const downloadExport = () => {
        try {
            const { files } = exportTailwindTheme(theme);
            for (const file of files) download(file.name, file.content);
            setExportError(null);
        } catch (error) {
            if (error instanceof ExportBlockedError) {
                // Дружелюбно и без приукрашивания: показываем, что делать.
                setExportError(
                    'Экспорт заблокирован политикой: сначала разберитесь ' +
                        'с парами, помеченными «Не проходит». Таблица ниже ' +
                        'покажет, какой тон выбрать и почему пара не прошла.',
                );
            } else {
                throw error;
            }
        }
    };

    return (
        <section aria-label="Аудит темы" className="flex flex-col gap-4">
            <header className="flex flex-wrap items-center gap-3">
                <h2 className="text-lg font-semibold">Паспорт доступности</h2>
                <span
                    className={cn(
                        'rounded-full px-3 py-1 text-sm font-medium',
                        summary.exportAllowed
                            ? 'bg-[var(--c42-primary)] text-[var(--c42-on-primary)]'
                            : 'bg-[var(--c42-error)] text-[var(--c42-on-error)]',
                    )}
                >
                    {summary.exportAllowed
                        ? 'Экспорт разрешён'
                        : 'Экспорт заблокирован в строгом режиме'}
                </span>
                <span className="text-sm opacity-70">
                    Пар: {summary.totalPairsChecked} · проходит: {summary.passed}{' '}
                    · предупреждения: {summary.warnings} · не проходит:{' '}
                    {summary.failed}
                </span>
            </header>

            <div className="flex flex-wrap gap-2">
                <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowAllModes((v) => !v)}
                >
                    {showAllModes ? 'Только текущий режим' : 'Показать все режимы'}
                </Button>
                <Button size="sm" variant="outline" onClick={copyTokensCss}>
                    {copied ? 'Скопировано ✓' : 'Скопировать CSS'}
                </Button>
                <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                        download(
                            'accessibility-report.json',
                            generatePassportJson(theme),
                            'application/json',
                        )
                    }
                >
                    Скачать отчёт JSON
                </Button>
                <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                        download(
                            'accessibility-report.md',
                            buildMarkdownReport(theme.audit, policy.name),
                        )
                    }
                >
                    Скачать отчёт MD
                </Button>
                <Button size="sm" onClick={downloadExport}>
                    Скачать тему (3 файла)
                </Button>
            </div>

            {exportError && (
                <p
                    role="alert"
                    className="rounded-md bg-[var(--c42-error-container)] px-3 py-2 text-sm text-[var(--c42-on-error-container)]"
                >
                    {exportError}
                </p>
            )}

            <div className="overflow-x-auto rounded-lg border border-[var(--c42-outline)]">
                <table className="w-full text-left text-sm">
                    <thead>
                        <tr className="border-b border-[var(--c42-outline)]">
                            <th scope="col" className="px-3 py-2 font-medium">
                                Пара
                            </th>
                            <th scope="col" className="px-3 py-2 font-medium">
                                Режим
                            </th>
                            <th scope="col" className="px-3 py-2 text-right font-medium">
                                Факт
                            </th>
                            <th scope="col" className="px-3 py-2 text-right font-medium">
                                Требуется
                            </th>
                            <th scope="col" className="px-3 py-2 font-medium">
                                Статус
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((check) => {
                            const solve =
                                solveResults[`${check.pair}|${check.mode}`]?.[0];
                            return (
                                <Fragment key={`${check.pair}|${check.mode}`}>
                                    <tr
                                        className={cn(
                                            'border-b border-[var(--c42-outline)]',
                                            STATUS_STYLES[check.status],
                                        )}
                                    >
                                        <td className="px-3 py-2 font-mono text-xs">
                                            {check.pair}
                                        </td>
                                        <td className="px-3 py-2 text-xs">
                                            {check.mode}
                                        </td>
                                        <td className="px-3 py-2 text-right font-mono">
                                            {check.actualRatio.toFixed(2)}:1
                                        </td>
                                        <td className="px-3 py-2 text-right font-mono opacity-70">
                                            {check.requiredRatio.toFixed(2)}:1
                                        </td>
                                        <td className="px-3 py-2">
                                            {STATUS_LABELS[check.status]}
                                            {check.importance === 'required' && (
                                                <span className="ml-1 opacity-60">
                                                    (обязательно)
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                    <tr className={STATUS_STYLES[check.status]}>
                                        <td colSpan={5} className="px-3 pb-2">
                                            <details>
                                                <summary className="cursor-pointer text-xs opacity-60">
                                                    Почему так?
                                                </summary>
                                                <ul className="mt-1 list-disc pl-5 text-xs opacity-80">
                                                    {solve && (
                                                        <li>{solve.reason}</li>
                                                    )}
                                                    {solve &&
                                                        solve.solvedTone !==
                                                            null &&
                                                        solve.solvedTone !==
                                                            solve.idealTone && (
                                                            <li>
                                                                Тон{' '}
                                                                {
                                                                    solve.solvedTone
                                                                }{' '}
                                                                выбран вместо
                                                                идеального{' '}
                                                                {
                                                                    solve.idealTone
                                                                }
                                                                .
                                                            </li>
                                                        )}
                                                    {check.apcaLc !==
                                                        undefined && (
                                                        <li>
                                                            APCA Lc:{' '}
                                                            {check.apcaLc.toFixed(
                                                                2,
                                                            )}{' '}
                                                            — аналитика, не
                                                            критерий.
                                                        </li>
                                                    )}
                                                    {check.notes && (
                                                        <li>{check.notes}</li>
                                                    )}
                                                    <li>
                                                        Уверенность:{' '}
                                                        {check.confidence}.
                                                    </li>
                                                </ul>
                                            </details>
                                        </td>
                                    </tr>
                                </Fragment>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            <p className="text-xs opacity-60">{theme.audit.legalDisclaimer}</p>
        </section>
    );
}

export default AuditPanel;
