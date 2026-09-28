'use client';

import React, { useState, useCallback, useEffect } from 'react';
import {
    DndContext,
    DragEndEvent,
    DragOverlay,
    DragStartEvent,
    pointerWithin,
    PointerSensor,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import { GRID_PRESETS, type GridPreset } from '@/lib/grid-presets.config';
import GridSlot, { type GridImage } from './GridSlot';

interface AdminGridEditorProps {
    presetId: string | null;
    initialImages?: GridImage[];
    onImagesChange?: (images: GridImage[]) => void;
    onPresetChange?: (presetId: string) => void;
    onFileUpload?: (file: File, slotIndex: number) => void;
}

export default function AdminGridEditor({
    presetId: rawPresetId,
    initialImages = [],
    onImagesChange,
    onPresetChange,
    onFileUpload,
}: AdminGridEditorProps) {
    // Если presetId невалиден (например, null из БД), используем первый доступный пресет
    const presetId =
        rawPresetId && GRID_PRESETS[rawPresetId]
            ? rawPresetId
            : Object.keys(GRID_PRESETS)[0];
    const preset: GridPreset = GRID_PRESETS[presetId];

    const [activeDragImage, setActiveDragImage] = useState<GridImage | null>(
        null,
    );

    const [images, setImages] = useState<GridImage[]>(() => {
        if (initialImages.length > 0) return initialImages;
        // Создаём пустые слоты
        if (!preset) return [];
        return Array.from({ length: preset.slots }, (_, i) => ({
            id: `empty-${i}`,
            url: '',
            slotIndex: i,
        }));
    });

    // Синхронизируем состояние, когда родитель обновляет изображения
    // (например, после завершения загрузки файла на сервер и получения fileId).
    useEffect(() => {
        if (initialImages.length > 0) {
            setImages(initialImages);
        } else if (preset) {
            setImages(
                Array.from({ length: preset.slots }, (_, i) => ({
                    id: `empty-${i}`,
                    url: '',
                    slotIndex: i,
                })),
            );
        }
    }, [initialImages, preset]);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        }),
    );

    // Запоминаем перетаскиваемое изображение для DragOverlay
    const handleDragStart = useCallback(
        (event: DragStartEvent) => {
            const slotIndex = event.active.data.current?.slotIndex as
                | number
                | undefined;
            if (slotIndex !== undefined) {
                const img = images.find(
                    (i) => i.slotIndex === slotIndex && i.url,
                );
                setActiveDragImage(img ?? null);
            }
        },
        [images],
    );

    // Обработчик завершения перетаскивания (Swap)
    const handleDragEnd = useCallback(
        (event: DragEndEvent) => {
            const { active, over } = event;

            if (!over || active.id === over.id) return;

            const activeSlotIndex = active.data.current?.slotIndex as
                | number
                | undefined;
            const overSlotIndex = over.data.current?.slotIndex as
                | number
                | undefined;

            if (
                activeSlotIndex === undefined ||
                overSlotIndex === undefined
            ) {
                return;
            }

            setActiveDragImage(null);

            // Чистая функция (без побочных эффектов внутри setState-
            // апдейтера — иначе StrictMode вызывает её дважды):
            // считаем новый порядок снаружи, затем one-sync вверх.
            const next = images.map((img) => ({ ...img }));
            const activeItem = next.find(
                (img) => img.slotIndex === activeSlotIndex,
            );
            const overItem = next.find(
                (img) => img.slotIndex === overSlotIndex,
            );

            if (activeItem) activeItem.slotIndex = overSlotIndex;
            if (overItem) overItem.slotIndex = activeSlotIndex;

            setImages(next);
            // Сообщаем родителю новый порядок. Без этого вызова перестановка
            // слотов жила только в локальном состоянии редактора и терялась
            // при сохранении кейса (и откатывалась при следующей загрузке
            // файла — initialImages перетирал локальный порядок).
            onImagesChange?.(next);
        },
        [images, onImagesChange],
    );

    // Обработчик загрузки файла в конкретный слот (fallback, когда родитель
    // не передал onFileUpload)
    const handleFileUpload = useCallback(
        (file: File, targetSlotIndex: number) => {
            const objectUrl = URL.createObjectURL(file);
            const newImage: GridImage = {
                id: `img-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
                url: objectUrl,
                slotIndex: targetSlotIndex,
            };

            // Убираем старое изображение из этого слота, если есть
            const next = [
                ...images.filter((img) => img.slotIndex !== targetSlotIndex),
                newImage,
            ];
            setImages(next);
            onImagesChange?.(next);
        },
        [images, onImagesChange],
    );

    // Смена пресета
    const handlePresetChange = useCallback(
        (newPresetId: string) => {
            onPresetChange?.(newPresetId);
        },
        [onPresetChange],
    );

    if (!GRID_PRESETS[presetId]) {
        return (
            <div className='p-8 text-center text-[var(--md-sys-color-error)]'>
                Не найден ни один пресет сетки.
            </div>
        );
    }

    return (
        <div className='space-y-6'>
            {/* Выбор пресета */}
            <div className='space-y-3'>
                <h3 className='text-lg font-semibold text-[var(--md-sys-color-on-surface)]'>
                    Выберите шаблон сетки
                </h3>
                <div className='flex flex-wrap gap-3'>
                    {Object.entries(GRID_PRESETS).map(([id, p]) => (
                        <button
                            key={id}
                            type='button'
                            onClick={() => handlePresetChange(id)}
                            className={`px-4 py-2 rounded-lg border-2 text-sm font-medium transition-all cursor-pointer ${
                                id === presetId
                                    ? 'border-[var(--md-sys-color-primary)] bg-[var(--md-sys-color-primary-container)] text-[var(--md-sys-color-on-primary-container)]'
                                    : 'border-[var(--md-sys-color-outline-variant)] bg-[var(--md-sys-color-surface)] text-[var(--md-sys-color-on-surface)] hover:border-[var(--md-sys-color-outline)]'
                            }`}
                        >
                            {p.name}
                            <span className='ml-1.5 text-xs opacity-70'>
                                ({p.slots} фото)
                            </span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Сетка */}
            <DndContext
                collisionDetection={pointerWithin}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                sensors={sensors}
            >
                <div className='grid grid-cols-8 gap-3 auto-rows-[160px]'>
                    {preset.layoutClasses.map((className, index) => {
                        const image = images.find(
                            (img) => img.slotIndex === index && img.url,
                        );
                        return (
                            <GridSlot
                                key={index}
                                slotIndex={index}
                                className={className}
                                image={image}
                                onFileUpload={onFileUpload ?? handleFileUpload}
                            />
                        );
                    })}
                </div>
                <DragOverlay dropAnimation={null}>
                    {activeDragImage ? (
                        <div className='w-40 h-40 rounded-lg overflow-hidden opacity-90 shadow-lg ring-2 ring-[var(--md-sys-color-primary)]'>
                        {/* DragOverlay-превью: blob:/R2-URL, размеры
                            неизвестны, контейнер фиксирован w-40 h-40. */}
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={activeDragImage.url}
                            alt=''
                            className='w-full h-full object-cover'
                        />
                        </div>
                    ) : null}
                </DragOverlay>
            </DndContext>

            {/* Отладочная информация (можно убрать) */}
            <details className='mt-4 text-sm text-[var(--md-sys-color-on-surface-variant)]'>
                <summary className='cursor-pointer font-medium'>
                    Данные для отправки (JSON)
                </summary>
                <pre className='mt-2 p-3 bg-[var(--md-sys-color-surface-variant)] rounded-lg overflow-x-auto text-xs'>
                    {JSON.stringify(
                        {
                            presetId,
                            images: images
                                .filter((img) => img.url)
                                .map(({ id, url, slotIndex }) => ({
                                    id,
                                    url,
                                    slotIndex,
                                })),
                        },
                        null,
                        2,
                    )}
                </pre>
            </details>
        </div>
    );
}
