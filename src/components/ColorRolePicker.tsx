'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { GripVertical, Plus, Trash2, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import {
    getProjectColorRoles,
    createColorRole,
    updateColorRole,
    deleteColorRole,
    reorderColorRoles,
} from '@/lib/actions/projects';
import { getContrastRatio } from '@/lib/utils/contrast';
import Title from './ui/Title';

type ColorRole = {
    id: string;
    name1: string;
    name2: string;
    lightColor1: string;
    lightColor2: string;
    darkColor1: string;
    darkColor2: string;
    lightContrastRatio: number | null;
    darkContrastRatio: number | null;
    order: number;
};

type ColorRolePickerProps = {
    projectId: string;
};

type NewRoleForm = {
    name1: string;
    name2: string;
    lightColor1: string;
    lightColor2: string;
    darkColor1: string;
    darkColor2: string;
    lightContrastRatio: string;
    darkContrastRatio: string;
};

const EMPTY_FORM: NewRoleForm = {
    name1: '',
    name2: '',
    lightColor1: '#0066FF',
    lightColor2: '#0052CC',
    darkColor1: '#3385FF',
    darkColor2: '#66A3FF',
    lightContrastRatio: '',
    darkContrastRatio: '',
};

export default function ColorRolePicker({ projectId }: ColorRolePickerProps) {
    const [roles, setRoles] = useState<ColorRole[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [dragIndex, setDragIndex] = useState<number | null>(null);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState<NewRoleForm>(EMPTY_FORM);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Авто-расчёт контрастности при изменении цветов светлой темы
    useEffect(() => {
        if (form.lightColor1.length >= 4 && form.lightColor2.length >= 4) {
            const ratio = getContrastRatio(form.lightColor1, form.lightColor2);
            setForm((prev) => ({
                ...prev,
                lightContrastRatio: ratio.toFixed(1),
            }));
        }
    }, [form.lightColor1, form.lightColor2]);

    // Авто-расчёт контрастности при изменении цветов тёмной темы
    useEffect(() => {
        if (form.darkColor1.length >= 4 && form.darkColor2.length >= 4) {
            const ratio = getContrastRatio(form.darkColor1, form.darkColor2);
            setForm((prev) => ({
                ...prev,
                darkContrastRatio: ratio.toFixed(1),
            }));
        }
    }, [form.darkColor1, form.darkColor2]);

    const loadRoles = useCallback(async () => {
        try {
            const data = await getProjectColorRoles(projectId);
            setRoles(data);
        } catch {
            setRoles([]);
        } finally {
            setIsLoading(false);
        }
    }, [projectId]);

    useEffect(() => {
        loadRoles();
    }, [loadRoles]);

    const openCreate = () => {
        setEditingId(null);
        setForm(EMPTY_FORM);
        setError(null);
        setShowForm(true);
    };

    const openEdit = (role: ColorRole) => {
        setEditingId(role.id);
        setForm({
            name1: role.name1,
            name2: role.name2,
            lightColor1: role.lightColor1,
            lightColor2: role.lightColor2,
            darkColor1: role.darkColor1,
            darkColor2: role.darkColor2,
            lightContrastRatio: role.lightContrastRatio?.toString() ?? '',
            darkContrastRatio: role.darkContrastRatio?.toString() ?? '',
        });
        setError(null);
        setShowForm(true);
    };

    const handleSubmit = async () => {
        if (!form.name1.trim()) {
            setError('Введите основной цвет');
            return;
        }
        if (!form.name2.trim()) {
            setError('Введите дополнительный цвет');
            return;
        }
        setSaving(true);
        setError(null);
        try {
            const payload = {
                name1: form.name1.trim(),
                name2: form.name2.trim(),
                lightColor1: form.lightColor1,
                lightColor2: form.lightColor2,
                darkColor1: form.darkColor1,
                darkColor2: form.darkColor2,
                lightContrastRatio: form.lightContrastRatio
                    ? Number(form.lightContrastRatio)
                    : null,
                darkContrastRatio: form.darkContrastRatio
                    ? Number(form.darkContrastRatio)
                    : null,
            };

            if (editingId) {
                await updateColorRole(editingId, payload);
            } else {
                await createColorRole(projectId, payload);
            }

            setForm(EMPTY_FORM);
            setEditingId(null);
            setShowForm(false);
            await loadRoles();
        } catch (err) {
            setError(
                err instanceof Error ? err.message : 'Не удалось сохранить',
            );
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (roleId: string) => {
        try {
            await deleteColorRole(roleId);
            await loadRoles();
        } catch {
            setError('Не удалось удалить роль');
        }
    };

    const handleDragStart = (index: number) => setDragIndex(index);

    const handleDragOver = (e: React.DragEvent, index: number) => {
        e.preventDefault();
        if (dragIndex === null || dragIndex === index) return;

        const newRoles = [...roles];
        const [dragged] = newRoles.splice(dragIndex, 1);
        newRoles.splice(index, 0, dragged);
        setRoles(newRoles);
        setDragIndex(index);
    };

    const handleDragEnd = async () => {
        setDragIndex(null);
        try {
            await reorderColorRoles(
                projectId,
                roles.map((r) => r.id),
            );
        } catch {
            setError('Не удалось сохранить порядок');
        }
    };

    if (isLoading) {
        return (
            <div className='space-y-2'>
                {Array.from({ length: 3 }).map((_, i) => (
                    <div
                        key={i}
                        className='h-16 animate-pulse rounded-lg bg-[var(--md-sys-color-surface-variant)]'
                    />
                ))}
            </div>
        );
    }

    return (
        <div className='space-y-3'>
            {roles.length === 0 && !showForm ? (
                <p className='text-body-sm text-[var(--md-sys-color-on-surface-variant)]'>
                    Цветовых ролей пока нет. Добавьте первую роль.
                </p>
            ) : (
                <div className='space-y-1' role='list' aria-label='Color roles'>
                    {roles.map((role, index) => (
                        <div
                            key={role.id}
                            draggable
                            onDragStart={() => handleDragStart(index)}
                            onDragOver={(e) => handleDragOver(e, index)}
                            onDragEnd={handleDragEnd}
                            className={cn(
                                'flex items-center gap-2 rounded-md border border-[var(--md-sys-color-outline-variant)]  p-2 cursor-grab active:cursor-grabbing transition-colors',
                                role.id === editingId
                                    ? 'bg-surface-container-highest'
                                    : 'bg-surface-container-high',
                                dragIndex === index &&
                                    'opacity-50 border-[var(--md-sys-color-primary)]',
                            )}
                            role='listitem'
                            aria-label={`${role.name1}, drag to reorder`}
                        >
                            <GripVertical className='h-4 w-4 text-[var(--md-sys-color-on-surface-variant)] shrink-0' />
                            <div className='flex gap-1'>
                                <div
                                    className='h-5 w-5 rounded-full border border-[var(--md-sys-color-outline-variant)]'
                                    style={{
                                        backgroundColor: role.lightColor1,
                                    }}
                                    title={`${role.name1} light 1`}
                                />
                                <div
                                    className='h-5 w-5 rounded-full border border-[var(--md-sys-color-outline-variant)]'
                                    style={{
                                        backgroundColor: role.lightColor2,
                                    }}
                                    title={`${role.name1} light 2`}
                                />
                                <div
                                    className='h-5 w-5 rounded-full border border-[var(--md-sys-color-outline-variant)]'
                                    style={{ backgroundColor: role.darkColor1 }}
                                    title={`${role.name1} dark 1`}
                                />
                                <div
                                    className='h-5 w-5 rounded-full border border-[var(--md-sys-color-outline-variant)]'
                                    style={{ backgroundColor: role.darkColor2 }}
                                    title={`${role.name1} dark 2`}
                                />
                            </div>
                            <div className='flex flex-col min-w-0'>
                                <span className='text-body-sm text-[var(--md-sys-color-on-surface)] truncate'>
                                    {role.name1}
                                </span>
                                <span className='text-label-sm text-[var(--md-sys-color-on-surface-variant)] truncate'>
                                    {role.name2}
                                </span>
                            </div>
                            <span className='ml-auto text-label-sm text-[var(--md-sys-color-on-surface-variant)]'>
                                #{index + 1}
                            </span>
                            <button
                                type='button'
                                onClick={() => openEdit(role)}
                                className='p-1 rounded text-[var(--md-sys-color-on-surface-variant)] hover:text-[var(--md-sys-color-primary)] hover:bg-[var(--md-sys-color-surface-variant)] transition-colors'
                                aria-label={`Редактировать роль ${role.name1}`}
                            >
                                <Pencil className='h-4 w-4' />
                            </button>
                            <button
                                type='button'
                                onClick={() => handleDelete(role.id)}
                                className='p-1 rounded text-[var(--md-sys-color-on-surface-variant)] hover:text-[var(--md-sys-color-error)] hover:bg-[var(--md-sys-color-surface-variant)] transition-colors'
                                aria-label={`Удалить роль ${role.name1}`}
                            >
                                <Trash2 className='h-4 w-4' />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {showForm ? (
                <div className='space-y-3 rounded-lg border border-[var(--md-sys-color-outline-variant)] p-4 bg-surface-container-highest'>
                    <div className='grid grid-cols-4 gap-5'>
                        <div className=''>
                            <Title tag='div' variant='title-lg'>
                                {editingId ? 'Редактирование' : 'Создание'}
                                <br />
                                <span>роли</span>
                            </Title>
                        </div>
                        <div>
                            <Label
                                htmlFor='roleName'
                                className='font-medium text-md pl-2'
                            >
                                Основной цвет
                            </Label>
                            <Input
                                id='roleName'
                                value={form.name1}
                                onChange={(e) =>
                                    setForm({ ...form, name1: e.target.value })
                                }
                                placeholder='Например: Primary'
                            />
                        </div>
                        <div>
                            <Label
                                htmlFor='roleName2'
                                className='font-medium text-md pl-2'
                            >
                                Дополнительный цвет
                            </Label>
                            <Input
                                id='roleName2'
                                value={form.name2}
                                onChange={(e) =>
                                    setForm({ ...form, name2: e.target.value })
                                }
                                placeholder='Например: onPrimary'
                            />
                        </div>
                        <div className=''>Контраст</div>
                    </div>

                    <hr />

                    <div className='grid grid-cols-4 gap-5 items-center'>
                        <div className=''>Светлый</div>
                        <div>
                            <div className='flex items-center gap-2'>
                                <input
                                    type='color'
                                    id='lightColor1'
                                    value={form.lightColor1}
                                    onChange={(e) =>
                                        setForm({
                                            ...form,
                                            lightColor1: e.target.value,
                                        })
                                    }
                                    className='h-10 w-10 cursor-pointer'
                                />
                                <Input
                                    value={form.lightColor1}
                                    onChange={(e) =>
                                        setForm({
                                            ...form,
                                            lightColor1: e.target.value,
                                        })
                                    }
                                />
                            </div>
                        </div>
                        <div>
                            <div className='flex items-center gap-2'>
                                <input
                                    type='color'
                                    id='lightColor2'
                                    value={form.lightColor2}
                                    onChange={(e) =>
                                        setForm({
                                            ...form,
                                            lightColor2: e.target.value,
                                        })
                                    }
                                    className='h-10 w-10'
                                />
                                <Input
                                    value={form.lightColor2}
                                    onChange={(e) =>
                                        setForm({
                                            ...form,
                                            lightColor2: e.target.value,
                                        })
                                    }
                                />
                            </div>
                        </div>
                        <div>
                            <Input
                                id='lightContrast'
                                type='number'
                                step='0.1'
                                value={form.lightContrastRatio}
                                readOnly
                                className='bg-[var(--md-sys-color-surface-container)] cursor-default'
                                placeholder='4.5'
                            />
                        </div>
                    </div>

                    <hr />

                    <div className='grid grid-cols-4 gap-5 items-center'>
                        <div className=''>Темный </div>
                        <div>
                            <div className='flex items-center gap-2'>
                                <input
                                    type='color'
                                    id='darkColor1'
                                    value={form.darkColor1}
                                    onChange={(e) =>
                                        setForm({
                                            ...form,
                                            darkColor1: e.target.value,
                                        })
                                    }
                                    className='h-10 w-10'
                                />
                                <Input
                                    value={form.darkColor1}
                                    onChange={(e) =>
                                        setForm({
                                            ...form,
                                            darkColor1: e.target.value,
                                        })
                                    }
                                />
                            </div>
                        </div>
                        <div>
                            <div className='flex items-center gap-2'>
                                <input
                                    type='color'
                                    id='darkColor2'
                                    value={form.darkColor2}
                                    onChange={(e) =>
                                        setForm({
                                            ...form,
                                            darkColor2: e.target.value,
                                        })
                                    }
                                    className='h-10 w-10'
                                />
                                <Input
                                    value={form.darkColor2}
                                    onChange={(e) =>
                                        setForm({
                                            ...form,
                                            darkColor2: e.target.value,
                                        })
                                    }
                                />
                            </div>
                        </div>
                        <div>
                            <Input
                                id='darkContrast'
                                type='number'
                                step='0.1'
                                value={form.darkContrastRatio}
                                readOnly
                                className='bg-[var(--md-sys-color-surface-container)] cursor-default'
                                placeholder='7.1'
                            />
                        </div>
                    </div>

                    {error && (
                        <p className='text-body-sm text-[var(--md-sys-color-error)]'>
                            {error}
                        </p>
                    )}

                    <div className='flex gap-2 mt-2'>
                        <Button
                            type='button'
                            disabled={saving}
                            onClick={handleSubmit}
                        >
                            {saving
                                ? 'Сохранение...'
                                : editingId
                                  ? 'Сохранить'
                                  : 'Добавить роль'}
                        </Button>
                        <Button
                            type='button'
                            variant='ghost'
                            onClick={() => {
                                setShowForm(false);
                                setEditingId(null);
                                setError(null);
                                setForm(EMPTY_FORM);
                            }}
                        >
                            Отмена
                        </Button>
                    </div>
                </div>
            ) : (
                <Button type='button' variant='outline' onClick={openCreate}>
                    <Plus className='h-4 w-4 mr-1' />
                    Добавить роль
                </Button>
            )}
        </div>
    );
}
