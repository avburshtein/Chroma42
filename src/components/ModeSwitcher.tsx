'use client';

import type { ThemeMode } from '@/engine/policy/policy';
import { Button } from '@/components/ui/Button';

/**
 * Переключатель 8 режимов темы: группа из 4 опций контраста +
 * тумблер свет/тьма — не один dropdown на 8 опций
 * (см. guidelines/patterns/mode-switching.md).
 */

const CONTRAST_OPTIONS = [
    { suffix: 'normal', label: 'Обычный' },
    { suffix: 'medium', label: 'Усиленный' },
    { suffix: 'high', label: 'Высокий' },
    { suffix: 'reduced-transparency', label: 'Без прозрачности' },
] as const;

const SCHEME_OPTIONS = [
    { prefix: 'light', label: 'Светлая' },
    { prefix: 'dark', label: 'Тёмная' },
] as const;

type ModeSwitcherProps = {
    readonly mode: ThemeMode;
    readonly onModeChange: (mode: ThemeMode) => void;
};

export function ModeSwitcher({ mode, onModeChange }: ModeSwitcherProps) {
    const currentContrast = mode.split('-').slice(1).join('-') as
        | 'normal'
        | 'medium'
        | 'high'
        | 'reduced-transparency';
    const currentScheme = mode.startsWith('dark') ? 'dark' : 'light';

    const isActive = (checked: boolean) =>
        checked
            ? 'default'
            : ('outline' as const);

    return (
        <section
            aria-label="Режим темы"
            className="flex flex-wrap items-center gap-4"
        >
            <div role="radiogroup" aria-label="Контраст темы" className="flex gap-2">
                {CONTRAST_OPTIONS.map((option) => (
                    <Button
                        key={option.suffix}
                        role="radio"
                        aria-checked={currentContrast === option.suffix}
                        variant={isActive(currentContrast === option.suffix)}
                        size="sm"
                        onClick={() =>
                            onModeChange(
                                `${currentScheme}-${option.suffix}` as ThemeMode,
                            )
                        }
                    >
                        {option.label}
                    </Button>
                ))}
            </div>

            <div role="radiogroup" aria-label="Свет/тьма" className="flex gap-2">
                {SCHEME_OPTIONS.map((option) => (
                    <Button
                        key={option.prefix}
                        role="radio"
                        aria-checked={currentScheme === option.prefix}
                        variant={isActive(currentScheme === option.prefix)}
                        size="sm"
                        onClick={() =>
                            onModeChange(
                                `${option.prefix}-${currentContrast}` as ThemeMode,
                            )
                        }
                    >
                        {option.label}
                    </Button>
                ))}
            </div>
        </section>
    );
}

export default ModeSwitcher;
