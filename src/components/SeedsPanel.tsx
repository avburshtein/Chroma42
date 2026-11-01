'use client';

import {
    HARMONY_SCHEMES,
    POLICY_IDS,
    type HarmonySchemeId,
    type PolicyId,
    type Seeds,
} from '@/engine';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/cn';

/**
 * Панель сидов: primary выбирает пользователь, secondary/tertiary
 * выводятся гармонической схемой (Этап 12.1), статусы — якоря движка.
 */

const POLICY_LABELS: Record<string, string> = {
    'standard-aa': 'WCAG 2.2 AA',
    'standard-aaa': 'WCAG 2.2 AAA',
    'gov-aa': 'Гос-политика AA (строгий)',
};

type SeedsPanelProps = {
    readonly primary: string;
    readonly schemeId: HarmonySchemeId;
    readonly policyId: PolicyId;
    readonly seeds: Seeds;
    readonly onPrimaryChange: (hex: string) => void;
    readonly onSchemeChange: (scheme: HarmonySchemeId) => void;
    readonly onPolicyChange: (policy: PolicyId) => void;
};

export function SeedsPanel({
    primary,
    schemeId,
    policyId,
    seeds,
    onPrimaryChange,
    onSchemeChange,
    onPolicyChange,
}: SeedsPanelProps) {
    const validHex = /^#[0-9a-fA-F]{6}$/.test(primary);

    return (
        <section
            aria-label="Сиды темы"
            className="rounded-lg border border-[var(--c42-outline)] p-4"
        >
            <div className="flex flex-wrap items-end gap-4">
                <label className="flex flex-col gap-1 text-sm">
                    <span>Primary-цвет</span>
                    <span className="flex items-center gap-2">
                        <input
                            type="color"
                            value={validHex ? primary : '#00543b'}
                            onChange={(e) => onPrimaryChange(e.target.value)}
                            className="h-9 w-12 cursor-pointer rounded border border-[var(--c42-outline)] bg-transparent p-1"
                            aria-label="Primary-цвет"
                        />
                        <input
                            type="text"
                            value={primary}
                            onChange={(e) => onPrimaryChange(e.target.value)}
                            className={cn(
                                'h-9 w-28 rounded border bg-transparent px-2 font-mono text-sm',
                                validHex
                                    ? 'border-[var(--c42-outline)]'
                                    : 'border-[var(--c42-error)]',
                            )}
                            aria-invalid={!validHex}
                        />
                    </span>
                </label>

                <label className="flex flex-col gap-1 text-sm">
                    <span>Гармония</span>
                    <select
                        value={schemeId}
                        onChange={(e) =>
                            onSchemeChange(e.target.value as HarmonySchemeId)
                        }
                        className="h-9 rounded border border-[var(--c42-outline)] bg-transparent px-2 text-sm"
                    >
                        {Object.values(HARMONY_SCHEMES).map((scheme) => (
                            <option key={scheme.id} value={scheme.id}>
                                {scheme.name}
                            </option>
                        ))}
                    </select>
                </label>

                <label className="flex flex-col gap-1 text-sm">
                    <span>Политика доступности</span>
                    <select
                        value={policyId}
                        onChange={(e) =>
                            onPolicyChange(e.target.value as PolicyId)
                        }
                        className="h-9 rounded border border-[var(--c42-outline)] bg-transparent px-2 text-sm"
                    >
                        {POLICY_IDS.map((id) => (
                            <option key={id} value={id}>
                                {POLICY_LABELS[id] ?? id}
                            </option>
                        ))}
                    </select>
                </label>
            </div>

            <p className="mt-3 text-sm opacity-70">
                Статусы (success, warning, error, info) — якоря движка:
                они не подстраиваются под primary, чтобы оставаться
                узнаваемыми в любой теме.
            </p>

            <div className="mt-3 flex flex-wrap gap-2" aria-label="Сиды темы">
                {Object.entries(seeds).map(([name, hex]) => (
                    <Button
                        key={name}
                        variant="outline"
                        size="sm"
                        className="gap-2 font-normal"
                        title={`${name}: ${hex}`}
                        tabIndex={-1}
                    >
                        <span
                            aria-hidden
                            className="h-4 w-4 rounded-full border border-[var(--c42-outline)]"
                            style={{ background: hex }}
                        />
                        {name}
                    </Button>
                ))}
            </div>
        </section>
    );
}

export default SeedsPanel;
