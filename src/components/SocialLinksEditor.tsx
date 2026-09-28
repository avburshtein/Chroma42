'use client';

import React, { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/Select';
import { GripVertical, Plus, Trash2 } from 'lucide-react';
import {
    addSocialLink,
    removeSocialLink,
    updateSocialLink,
    updateSocialLinkOrder,
} from '@/lib/actions/profile';

type SocialLink = {
    id?: string;
    platform: string;
    title: string;
    url: string;
    order: number;
};

type SocialLinksEditorProps = {
    profileId: string;
    initialLinks: SocialLink[];
};

const PLATFORM_OPTIONS = [
    { value: 'github', label: 'GitHub' },
    { value: 'behance', label: 'Behance' },
    { value: 'dribbble', label: 'Dribbble' },
    { value: 'telegram', label: 'Telegram' },
    { value: 'linkedin', label: 'LinkedIn' },
    { value: 'twitter', label: 'Twitter / X' },
    { value: 'instagram', label: 'Instagram' },
    { value: 'youtube', label: 'YouTube' },
    { value: 'medium', label: 'Medium' },
    { value: 'custom', label: 'Custom' },
];

export default function SocialLinksEditor({
    profileId,
    initialLinks,
}: SocialLinksEditorProps) {
    const [links, setLinks] = useState<SocialLink[]>(initialLinks);
    const [dragIndex, setDragIndex] = useState<number | null>(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Родитель монтирует редактор до завершения загрузки профиля, а useState
    // фиксирует только первый снимок initialLinks (пустой) — догоняем данные
    // из БД, когда они приходят (Main_page_Spec (26)). Локальные правки не
    // теряем: если пользователь уже успел что-то добавить — не затираем.
    useEffect(() => {
        setLinks((prev) => (prev.length === 0 ? initialLinks : prev));
    }, [initialLinks]);

    const addLink = async () => {
        setBusy(true);
        setError(null);
        try {
            const id = await addSocialLink(profileId, {
                platform: 'custom',
                title: '',
                url: '',
                order: links.length,
            });
            setLinks((prev) => [
                ...prev,
                {
                    id,
                    platform: 'custom',
                    title: '',
                    url: '',
                    order: prev.length,
                },
            ]);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to add link');
        } finally {
            setBusy(false);
        }
    };

    const removeLink = async (index: number) => {
        const link = links[index];
        if (!link) return;
        setBusy(true);
        setError(null);
        try {
            if (link.id) {
                await removeSocialLink(link.id);
            }
            const updated = links
                .filter((_, i) => i !== index)
                .map((l, i) => ({ ...l, order: i }));
            setLinks(updated);
            await persistOrder(updated);
        } catch (e) {
            setError(
                e instanceof Error ? e.message : 'Failed to remove link',
            );
        } finally {
            setBusy(false);
        }
    };

    const updateLink = (
        index: number,
        field: keyof SocialLink,
        fieldValue: string,
    ) => {
        setLinks((prev) =>
            prev.map((link, i) =>
                i === index ? { ...link, [field]: fieldValue } : link,
            ),
        );
    };

    // Правка поля сохраняется в БД сразу: Select — по change, Inputs — по blur.
    // Раньше экшена обновления не существовало и правки жили только в
    // локальном state — в БД оставались пустые строки (Main_page_Spec (26)).
    const persistField = (
        index: number,
        field: 'platform' | 'title' | 'url',
        value: string,
    ) => {
        const link = links[index];
        if (!link?.id) return;
        updateSocialLink(link.id, { [field]: value }).catch((e) =>
            setError(e instanceof Error ? e.message : 'Failed to save link'),
        );
    };

    const persistOrder = async (ordered: SocialLink[]) => {
        const withIds = ordered.filter((l): l is SocialLink & { id: string } =>
            Boolean(l.id),
        );
        if (withIds.length > 0) {
            await updateSocialLinkOrder(
                profileId,
                withIds.map((l) => ({ id: l.id, order: l.order })),
            );
        }
    };

    const handleDragStart = (index: number) => {
        setDragIndex(index);
    };

    const handleDragOver = (e: React.DragEvent, index: number) => {
        e.preventDefault();
        if (dragIndex === null || dragIndex === index) return;

        const newLinks = [...links];
        const [dragged] = newLinks.splice(dragIndex, 1);
        newLinks.splice(index, 0, dragged);
        const reordered = newLinks.map((link, i) => ({ ...link, order: i }));
        setLinks(reordered);
        setDragIndex(index);
    };

    const handleDragEnd = () => {
        setDragIndex(null);
        persistOrder(links);
    };

    return (
        <div className='space-y-3' role='list' aria-label='Social links'>
            {links.length === 0 && (
                <p className='text-body-sm text-[var(--md-sys-color-on-surface-variant)] py-4 text-center'>
                    No social links added yet.
                </p>
            )}

            {links.map((link, index) => (
                <div
                    key={link.id ?? `new-${index}`}
                    draggable
                    onDragStart={() => handleDragStart(index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragEnd={handleDragEnd}
                    className={cn(
                        'flex items-start gap-2 rounded-lg border border-[var(--md-sys-color-outline-variant)] bg-[var(--md-sys-color-surface)] p-3 cursor-grab active:cursor-grabbing transition-colors',
                        dragIndex === index && 'opacity-50',
                    )}
                    role='listitem'
                    aria-label={`Social link ${index + 1}`}
                >
                    <GripVertical className='h-5 w-5 text-[var(--md-sys-color-on-surface-variant)] shrink-0 mt-2' />

                    <div className='flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2'>
                        <Select
                            value={link.platform}
                            onValueChange={(v) => {
                                updateLink(index, 'platform', v);
                                persistField(index, 'platform', v);
                            }}
                        >
                            <SelectTrigger aria-label='Platform'>
                                <SelectValue placeholder='Platform' />
                            </SelectTrigger>
                            <SelectContent>
                                {PLATFORM_OPTIONS.map((opt) => (
                                    <SelectItem
                                        key={opt.value}
                                        value={opt.value}
                                    >
                                        {opt.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Input
                            value={link.title}
                            onChange={(e) =>
                                updateLink(index, 'title', e.target.value)
                            }
                            onBlur={(e) =>
                                persistField(index, 'title', e.target.value)
                            }
                            placeholder='Title'
                            aria-label='Link title'
                        />

                        <Input
                            value={link.url}
                            onChange={(e) =>
                                updateLink(index, 'url', e.target.value)
                            }
                            onBlur={(e) =>
                                persistField(index, 'url', e.target.value)
                            }
                            placeholder='https://...'
                            type='url'
                            aria-label='Link URL'
                        />
                    </div>

                    <button
                        type='button'
                        onClick={() => removeLink(index)}
                        disabled={busy}
                        className='flex h-9 w-9 items-center justify-center rounded-md text-[var(--md-sys-color-on-surface-variant)] hover:bg-[var(--md-sys-color-surface-variant)] hover:text-[var(--md-sys-color-error)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--md-sys-color-primary)] shrink-0 mt-1 cursor-pointer'
                        aria-label={`Remove link ${index + 1}`}
                    >
                        <Trash2 className='h-4 w-4' />
                    </button>
                </div>
            ))}

            {error && <p className='text-body-sm text-error'>{error}</p>}

            <Button
                type='button'
                variant='outline'
                size='sm'
                onClick={addLink}
                disabled={busy}
                className='w-full'
            >
                <Plus className='h-4 w-4 mr-1' />
                Add Link
            </Button>
        </div>
    );
}
