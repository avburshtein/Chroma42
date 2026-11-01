'use client';

import { useEffect, useMemo, useState } from 'react';
import {
    generateHarmonySeeds,
    generateTokensCss,
    LEGAL_DISCLAIMER,
    type HarmonySchemeId,
    type PolicyId,
    type ThemeMode,
} from '@/engine';
import {
    buildThemeBundle,
    DEFAULT_POLICY,
    DEFAULT_PRIMARY,
    DEFAULT_SCHEME,
} from '@/lib/theme-pipeline';
import { AuditPanel } from '@/components/AuditPanel';
import { ModeSwitcher } from '@/components/ModeSwitcher';
import { SeedsPanel } from '@/components/SeedsPanel';

/**
 * Минималистичная аудит-панель Chroma42 (Этап 9).
 *
 * Панель рендерится текущей темой — живое превью экспорта: движок
 * целиком работает на клиенте, живые значения `--c42-*` подставляются
 * тегом <style>, статический первый кадр — из app/theme-default.css.
 */
export default function Page() {
    const [primary, setPrimary] = useState(DEFAULT_PRIMARY);
    const [schemeId, setSchemeId] = useState<HarmonySchemeId>(DEFAULT_SCHEME);
    const [policyId, setPolicyId] = useState<PolicyId>(DEFAULT_POLICY);
    const [mode, setMode] = useState<ThemeMode>('light-normal');
    const [validPrimary, setValidPrimary] = useState(true);

    const seeds = useMemo(
        () => generateHarmonySeeds(primary, schemeId),
        // Валидность проверяем в обработчике ввода: невалидный HEX
        // просто не доходит до движка.
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [primary, schemeId],
    );

    const bundle = useMemo(
        () => buildThemeBundle('Chroma42 UI', seeds, policyId),
        [seeds, policyId],
    );

    // Живые токены: заменяем дефолтные значения из theme-default.css
    // значениями текущих сидов. Имена селекторов совпадают — переопределение
    // полное, панель всегда рендерится текущей темой.
    useEffect(() => {
        const el = document.createElement('style');
        el.id = 'c42-runtime';
        el.textContent = generateTokensCss(bundle.theme);
        document.head.appendChild(el);
        return () => el.remove();
    }, [bundle]);

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', mode);
    }, [mode]);

    const handlePrimaryChange = (hex: string) => {
        setPrimary(hex);
        setValidPrimary(/^#[0-9a-fA-F]{6}$/.test(hex));
    };

    const { theme, solveResults, solveWarnings } = bundle;
    const summary = theme.audit.summary;

    return (
        <main className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-8">
            <header>
                <h1 className="text-2xl font-semibold">Chroma42</h1>
                <p className="mt-1 text-sm opacity-70">
                    Цветовые токены OKLCH с честной проверкой контраста.
                    Выберите primary — движок соберёт шкалы, проверит все
                    пары по выбранной политике и покажет, почему каждая
                    пара проходит или нет.
                </p>
            </header>

            <SeedsPanel
                primary={primary}
                schemeId={schemeId}
                policyId={policyId}
                seeds={seeds}
                onPrimaryChange={handlePrimaryChange}
                onSchemeChange={setSchemeId}
                onPolicyChange={setPolicyId}
            />

            <ModeSwitcher mode={mode} onModeChange={setMode} />

            {!validPrimary && (
                <p role="alert" className="text-sm">
                    HEX первичного цвета пока неполный — введите 6 цифр,
                    например #00543b.
                </p>
            )}

            {!summary.exportAllowed && (
                <p
                    role="status"
                    className="rounded-md border border-[var(--c42-outline)] px-3 py-2 text-sm"
                >
                    Некоторые обязательные пары не прошли проверку — экспорт
                    заблокирован в строгом режиме. Это не поломка: таблица
                    ниже объясняет, какие тона солвер смог подтянуть, а какие
                    требуют изменения сида.
                </p>
            )}

            {solveWarnings.length > 0 && (
                <ul className="list-disc pl-5 text-sm opacity-80">
                    {solveWarnings.map((warning) => (
                        <li key={warning}>{warning}</li>
                    ))}
                </ul>
            )}

            <AuditPanel
                theme={theme}
                mode={mode}
                solveResults={solveResults}
            />

            <footer className="text-xs opacity-60">
                {LEGAL_DISCLAIMER}
            </footer>
        </main>
    );
}
