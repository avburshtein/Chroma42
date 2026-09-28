'use client';

import { useEffect, useState } from 'react';
import { Checkbox } from '@/components/ui/Checkbox';
import { Card } from '@/components/ui/Card';
import { Label } from '@/components/ui/Label';
import {
    getProjectSectionsVisibility,
    updateProjectSectionsVisibility,
} from '@/lib/actions/projects';

// Секции публичной страницы кейса. Ключ = ключ в projects.sectionsVisibility
// (см. миграцию 20260912150000_add_project_sections_visibility).
// Порядок массива = порядок секций на странице; номера на публичной странице
// идут подряд по фактически показанным секциям.
const CASE_SECTIONS: Array<{ key: string; label: string; hint: string }> = [
    {
        key: 'problem',
        label: 'Problem & Audience',
        hint: 'problem statement, goal, target users',
    },
    {
        key: 'research',
        label: 'User Research',
        hint: 'methodology, key metrics, personas',
    },
    {
        key: 'designProcess',
        label: 'Design Process',
        hint: 'design approach, wireframes, Lo-Fi prototype',
    },
    {
        key: 'designSystem',
        label: 'Design System',
        hint: 'moodboard, color tokens, typography',
    },
    {
        key: 'testing',
        label: 'Testing & Iteration',
        hint: 'before/after comparisons',
    },
    {
        key: 'finalDesign',
        label: 'Final Design',
        hint: 'showcase gallery, results, tools, Figma link',
    },
    {
        key: 'reflection',
        label: 'Reflection',
        hint: 'key takeaway, next steps',
    },
];

interface SectionsVisibilityEditorProps {
    projectId: string;
}

// Чекбоксы видимости секций кейса (автосейв). Секция без данных скрывается
// на публичной странице автоматически; чекбокс — override «скрыть заполненную».
export default function SectionsVisibilityEditor({
    projectId,
}: SectionsVisibilityEditorProps) {
    const [visibility, setVisibility] = useState<
        Partial<Record<string, boolean>>
    >({});
    const [loaded, setLoaded] = useState(false);
    const [savingKey, setSavingKey] = useState<string | null>(null);

    useEffect(() => {
        if (!projectId) return;
        getProjectSectionsVisibility(projectId)
            .then((map) => setVisibility(map))
            .catch(() => {})
            .finally(() => setLoaded(true));
    }, [projectId]);

    const isVisible = (key: string) => visibility[key] !== false;

    const onToggle = async (key: string, checked: boolean) => {
        if (!projectId) return;
        const previous = visibility[key];
        // Полная карта значений (boolean для всех секций) — для сохранения
        const next: Record<string, boolean> = {};
        for (const section of CASE_SECTIONS) {
            next[section.key] = visibility[section.key] !== false;
        }
        next[key] = checked;
        setVisibility(next);
        setSavingKey(key);
        try {
            await updateProjectSectionsVisibility(projectId, next);
        } catch {
            // Откат при ошибке сохранения
            setVisibility((prev) => ({ ...prev, [key]: previous }));
        } finally {
            setSavingKey(null);
        }
    };

    return (
        <Card className='mb-8 p-6'>
            <div className='mb-4 flex flex-col gap-1.5'>
                <h2 className='text-title-lg text-on-surface'>
                    Sections on the case page
                </h2>
                <p className='text-body-sm text-on-surface-variant'>
                    A section with no data is hidden on the live page
                    automatically. Uncheck a section to hide it even when
                    filled. Sections are numbered in order of the ones shown.
                </p>
            </div>
            <div className='flex flex-col gap-4'>
                {CASE_SECTIONS.map((section) => (
                    <div
                        key={section.key}
                        className='flex items-start gap-3'
                    >
                        <Checkbox
                            id={`section-visibility-${section.key}`}
                            checked={isVisible(section.key)}
                            disabled={!loaded || savingKey === section.key}
                            onCheckedChange={(checked) =>
                                onToggle(section.key, checked === true)
                            }
                            className='mt-0.5'
                        />
                        <div className='flex flex-col'>
                            <Label
                                htmlFor={`section-visibility-${section.key}`}
                            >
                                {section.label}
                            </Label>
                            <span className='text-body-sm text-on-surface-variant'>
                                {section.hint}
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        </Card>
    );
}
