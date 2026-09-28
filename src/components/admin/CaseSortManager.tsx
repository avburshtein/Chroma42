'use client';

import React, {
    useEffect,
    useRef,
    useState,
    useTransition,
} from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    DndContext,
    closestCenter,
    PointerSensor,
    useSensor,
    useSensors,
    type DragEndEvent,
} from '@dnd-kit/core';
import {
    SortableContext,
    arrayMove,
    useSortable,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Check, ChevronDown, GripVertical, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import {
    archiveProject,
    deleteProject,
    reorderProjects,
    setCaseSortMode,
    unarchiveProject,
} from '@/lib/actions/projects';
import type { CaseSortMode } from '@/db/schema/profiles';
import { cn } from '@/lib/utils';

export type CaseProjectRow = {
    id: string;
    title: string;
    slug: string;
    status: 'draft' | 'published' | 'archived';
    viewsCount: number;
    updatedLabel: string;
};

interface CaseSortManagerProps {
    profileSlug: string;
    mode: CaseSortMode;
    autoRows: CaseProjectRow[];
    manualRows: CaseProjectRow[];
}

const SORT_OPTIONS: Array<{ value: CaseSortMode; label: string }> = [
    { value: 'newest', label: 'Сначала новые' },
    { value: 'oldest', label: 'Сначала старые' },
    { value: 'alpha_asc', label: 'A → Z' },
    { value: 'alpha_desc', label: 'Z → A' },
    { value: 'manual', label: 'Вручную (drag & drop)' },
];

const STATUS_META: Record<
    CaseProjectRow['status'],
    { label: string; className: string }
> = {
    published: {
        label: 'Опубликован',
        className: 'bg-primary-container text-on-primary-container',
    },
    draft: {
        label: 'Черновик',
        className: 'bg-surface-variant text-on-surface-variant',
    },
    archived: {
        label: 'Архив',
        className: 'bg-surface-variant text-on-surface-variant',
    },
};

interface RowActionsProps {
    row: CaseProjectRow;
    profileSlug: string;
    onDelete: (id: string) => void;
    onSetStatus: (id: string, action: 'archive' | 'unarchive') => void;
    pending: boolean;
}

// Контент строки без ручки: заголовок-ссылка, чип статуса, просмотры,
// дата обновления, действия (как в прежней таблице /admin).
function RowContent({
    row,
    profileSlug,
    onDelete,
    onSetStatus,
    pending,
}: RowActionsProps) {
    const meta = STATUS_META[row.status];
    return (
        <>
            <div className='min-w-0 flex-1 px-2'>
                <Link
                    href={`/admin/projects/${row.id}/edit/general`}
                    className='block overflow-hidden text-ellipsis whitespace-nowrap text-body-md font-medium text-on-surface hover:text-primary'
                >
                    {row.title}
                </Link>
            </div>

            <span
                className={cn(
                    'mr-2 inline-block shrink-0 rounded-full px-2 py-0.5 text-label-sm',
                    meta.className,
                )}
            >
                {meta.label}
            </span>

            <span className='hidden w-14 shrink-0 text-right text-body-sm text-on-surface-variant sm:block'>
                {row.viewsCount}
            </span>
            <span className='hidden w-24 shrink-0 text-right text-body-sm text-on-surface-variant md:block'>
                {row.updatedLabel}
            </span>

            <div className='flex shrink-0 items-center gap-1 pl-2'>
                <Button
                    variant='ghost'
                    onClick={() => onDelete(row.id)}
                    disabled={pending}
                    className='text-error'
                >
                    Удалить
                </Button>
                {row.status === 'published' && (
                    <Button
                        variant='ghost'
                        onClick={() => onSetStatus(row.id, 'archive')}
                        disabled={pending}
                    >
                        В&nbsp;архив
                    </Button>
                )}
                {row.status === 'archived' && (
                    <Button
                        variant='ghost'
                        onClick={() => onSetStatus(row.id, 'unarchive')}
                        disabled={pending}
                        className='text-primary'
                    >
                        Восстановить
                    </Button>
                )}
                <Link href={`/u/${profileSlug}/${row.slug}`}>
                    <Button variant='ghost'>На&nbsp;сайт</Button>
                </Link>
            </div>
        </>
    );
}

// Auto-режимы: строка без drag-логики (ручка видна, но неактивна —
// порядок задаёт выбранный режим, а не пользователь).
function PlainCaseRow(props: RowActionsProps) {
    return (
        <div className='border-b border-outline-variant last:border-0'>
            <div className='flex min-w-0 items-center px-2 py-2 hover:bg-surface-variant/30'>
                <span className='flex h-9 w-8 shrink-0 items-center justify-center opacity-25'>
                    <GripVertical
                        className='h-4 w-4 text-on-surface-variant'
                        aria-hidden='true'
                    />
                </span>
                <RowContent {...props} />
            </div>
        </div>
    );
}

// Manual-режим: sortable-строка dnd-kit; перетаскивание за ручку,
// чтобы не конфликтовать с кнопками действий.
function SortableCaseRow({
    row,
    profileSlug,
    onDelete,
    onSetStatus,
    pending,
}: RowActionsProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        setActivatorNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: row.id });

    return (
        <div
            ref={setNodeRef}
            style={{
                transform: CSS.Transform.toString(transform),
                transition,
            }}
            className={cn(
                'border-b border-outline-variant last:border-0',
                isDragging && 'relative z-10 bg-surface-variant/40 shadow-md',
            )}
        >
            <div className='flex min-w-0 items-center px-2 py-2 hover:bg-surface-variant/30'>
                <button
                    type='button'
                    ref={setActivatorNodeRef}
                    className='flex h-9 w-8 shrink-0 cursor-grab touch-none items-center justify-center rounded text-on-surface-variant active:cursor-grabbing'
                    aria-label='Перетащить для изменения порядка'
                    {...attributes}
                    {...listeners}
                >
                    <GripVertical className='h-4 w-4' aria-hidden='true' />
                </button>
                <RowContent
                    row={row}
                    profileSlug={profileSlug}
                    onDelete={onDelete}
                    onSetStatus={onSetStatus}
                    pending={pending}
                />
            </div>
        </div>
    );
}

/**
 * Панель сортировки кейсов: один dropdown «Сортировка» с авто-режимами
 * и Manual. Авто-режим пересчитывается на сервере (router.refresh),
 * Manual — drag & drop строк с сохранением через reorderProjects
 * (projects.sort_order). Режим хранится в profiles.case_sort_mode и
 * управляет порядком публичной галереи. «Сохранено ✓» — как в WizardSaveBar.
 */
export default function CaseSortManager({
    profileSlug,
    mode: initialMode,
    autoRows,
    manualRows,
}: CaseSortManagerProps) {
    const router = useRouter();
    const [mode, setMode] = useState<CaseSortMode>(initialMode);
    const [manual, setManual] = useState<CaseProjectRow[]>(manualRows);
    const [saved, setSaved] = useState(false);
    const [pending, startTransition] = useTransition();
    const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Сервер прислал новые данные после router.refresh() — синхронизируем
    useEffect(() => {
        setMode(initialMode);
    }, [initialMode]);
    useEffect(() => {
        setManual(manualRows);
    }, [manualRows]);

    useEffect(() => {
        return () => {
            if (savedTimer.current) clearTimeout(savedTimer.current);
        };
    }, []);

    const flashSaved = () => {
        setSaved(true);
        if (savedTimer.current) clearTimeout(savedTimer.current);
        savedTimer.current = setTimeout(() => setSaved(false), 2500);
    };

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    );

    const handleModeChange = (next: CaseSortMode) => {
        setMode(next);
        startTransition(async () => {
            await setCaseSortMode(next);
            // Auto-режимы пересчитываются на сервере; для Manual строки
            // (manualRows) уже загружены — refresh не нужен
            if (next !== 'manual') router.refresh();
            flashSaved();
        });
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;
        const oldIndex = manual.findIndex((r) => r.id === active.id);
        const newIndex = manual.findIndex((r) => r.id === over.id);
        if (oldIndex < 0 || newIndex < 0) return;
        const next = arrayMove(manual, oldIndex, newIndex);
        setManual(next);
        startTransition(async () => {
            await reorderProjects(next.map((r) => r.id));
            flashSaved();
        });
    };

    const removeRow = (id: string) => {
        setManual((prev) => prev.filter((r) => r.id !== id));
        startTransition(async () => {
            await deleteProject(id);
            router.refresh();
        });
    };

    const setStatus = (id: string, action: 'archive' | 'unarchive') => {
        startTransition(async () => {
            if (action === 'archive') {
                await archiveProject(id);
            } else {
                await unarchiveProject(id);
            }
            router.refresh();
        });
    };

    const rows = mode === 'manual' ? manual : autoRows;

    const rowProps = (row: CaseProjectRow) => ({
        row,
        profileSlug,
        onDelete: removeRow,
        onSetStatus: setStatus,
        pending,
    });

    return (
        <div className='mb-4'>
            {/* Панель: один dropdown вместо пары Toggle+Dropdown — Manual
                это просто ещё один вариант сортировки */}
            <div className='mb-3 flex flex-wrap items-center gap-3'>
                <label
                    htmlFor='case-sort-mode'
                    className='text-label-md text-on-surface-variant'
                >
                    Сортировка
                </label>
                {/* Нативный select рисует шеврон с непредсказуемыми отступами —
                    убираем appearance и рисуем свой: зазоры симметричны —
                    pl-3 слева = 12px между текстом и иконкой = 12px от
                    иконки до правого края */}
                <div className='relative'>
                    <select
                        id='case-sort-mode'
                        value={mode}
                        onChange={(e) =>
                            handleModeChange(e.target.value as CaseSortMode)
                        }
                        disabled={pending}
                        className='h-10 appearance-none rounded-md border border-outline-variant bg-surface pl-3 pr-10 text-body-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary'
                    >
                        {SORT_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                                {opt.label}
                            </option>
                        ))}
                    </select>
                    <ChevronDown
                        aria-hidden='true'
                        className='pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant'
                    />
                </div>
                {pending ? (
                    <span className='inline-flex items-center gap-1.5 text-label-md text-on-surface-variant'>
                        <Loader2
                            className='h-4 w-4 animate-spin'
                            aria-hidden='true'
                        />
                        Сохраняем…
                    </span>
                ) : saved ? (
                    <span
                        className='inline-flex items-center gap-1.5 text-label-md text-primary'
                        role='status'
                    >
                        <Check className='h-4 w-4' aria-hidden='true' />
                        Сохранено
                    </span>
                ) : null}
            </div>

            {mode === 'manual' && (
                <p className='mb-2 text-body-sm text-on-surface-variant'>
                    Перетаскивайте строки за значок ⠿ — порядок сразу
                    применится на сайте.
                </p>
            )}

            {mode === 'manual' ? (
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                >
                    <SortableContext
                        items={manual.map((r) => r.id)}
                        strategy={verticalListSortingStrategy}
                    >
                        <div className='overflow-hidden rounded-lg border border-outline-variant'>
                            {manual.map((row) => (
                                <SortableCaseRow
                                    key={row.id}
                                    {...rowProps(row)}
                                />
                            ))}
                        </div>
                    </SortableContext>
                </DndContext>
            ) : (
                <div className='overflow-hidden rounded-lg border border-outline-variant'>
                    {rows.map((row) => (
                        <PlainCaseRow key={row.id} {...rowProps(row)} />
                    ))}
                </div>
            )}

            {rows.length === 0 && (
                <div className='rounded-lg border border-outline-variant px-4 py-6 text-body-sm text-on-surface-variant'>
                    Нет проектов в этой вкладке
                </div>
            )}
        </div>
    );
}
