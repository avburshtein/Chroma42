'use client';

import React, { useCallback, useRef } from 'react';
import { useDroppable, useDraggable } from '@dnd-kit/core';
import { useDropzone } from 'react-dropzone';
import { cn } from '@/lib/utils';
import { Upload, GripVertical, RefreshCw } from 'lucide-react';

export interface GridImage {
    id: string;
    url: string;
    slotIndex: number;
    file?: File;
    fileId?: string;
}

interface GridSlotProps {
    slotIndex: number;
    className: string;
    image?: GridImage;
    onFileUpload: (file: File, slotIndex: number) => void;
}

/**
 * Объединяет несколько callback-ref в один стабильный callback.
 * Всегда вызывает актуальные версии переданных ref.
 */
function useMergedRefs<T>(
    ...refs: (React.Ref<T> | undefined)[]
): React.RefCallback<T> {
    const refsRef = useRef(refs);
    refsRef.current = refs;

    const mergedRef = useRef<React.RefCallback<T> | null>(null);
    if (!mergedRef.current) {
        mergedRef.current = (node: T | null) => {
            for (const ref of refsRef.current) {
                if (typeof ref === 'function') {
                    ref(node);
                } else if (ref && typeof ref === 'object') {
                    (ref as React.MutableRefObject<T | null>).current = node;
                }
            }
        };
    }
    return mergedRef.current;
}

export default function GridSlot({
    slotIndex,
    className,
    image,
    onFileUpload,
}: GridSlotProps) {
    const hiddenInputRef = useRef<HTMLInputElement>(null);

    // 1. react-dropzone — загрузка файлов с ОС
    const {
        getRootProps,
        getInputProps,
        isDragActive: isFileOver,
    } = useDropzone({
        accept: { 'image/*': [] },
        multiple: false,
        noClick: !!image,
        onDrop: useCallback(
            (acceptedFiles: File[]) => {
                if (acceptedFiles.length > 0) {
                    onFileUpload(acceptedFiles[0], slotIndex);
                }
            },
            [onFileUpload, slotIndex],
        ),
    });

    const dropzoneRootProps = getRootProps();
    const { ref: dropzoneRef, ...dropzoneRest } = dropzoneRootProps;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dropzoneInputProps = getInputProps() as any;
    const originalInputRef = dropzoneInputProps.ref;

    const setInputRef = useCallback(
        (node: HTMLInputElement | null) => {
            if (typeof originalInputRef === 'function') {
                originalInputRef(node);
            }
            hiddenInputRef.current = node;
        },
        [originalInputRef],
    );

    // 2. dnd-kit Droppable — приёмник для внутренней сортировки
    const { setNodeRef: setDroppableRef, isOver: isDndOver } = useDroppable({
        id: `slot-${slotIndex}`,
        data: { slotIndex },
    });

    // 3. dnd-kit Draggable — перетаскиваемое фото
    const {
        attributes,
        listeners,
        setNodeRef: setDraggableRef,
        transform,
        isDragging,
    } = useDraggable({
        id: image?.id ?? `empty-${slotIndex}`,
        data: { slotIndex },
        disabled: !image,
    });

    // Мерж ref: dropzone callback + dnd-kit droppable callback
    const mergedRef = useMergedRefs(dropzoneRef, setDroppableRef);

    const dndStyle = transform
        ? {
              transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
              zIndex: 50,
              opacity: isDragging ? 0.5 : 1,
          }
        : undefined;

    const handleReplaceClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        hiddenInputRef.current?.click();
    };

    return (
        <div
            ref={mergedRef}
            {...dropzoneRest}
            className={cn(
                className,
                'relative rounded-lg border-2 transition-all',
                isFileOver
                    ? 'border-blue-500 bg-blue-50'
                    : isDndOver
                      ? 'border-green-500 bg-green-50'
                      : image
                        ? 'border-transparent'
                        : 'border-dashed border-[var(--md-sys-color-outline-variant)] bg-[var(--md-sys-color-surface-input)]',
            )}
        >
            <input {...dropzoneInputProps} ref={setInputRef} />

            {isFileOver && (
                <div className='absolute inset-0 z-20 flex items-center justify-center bg-blue-500/80 text-white font-medium'>
                    <Upload className='h-6 w-6 mr-2' />
                    Бросайте фото сюда
                </div>
            )}

            {isDndOver && !isFileOver && (
                <div className='absolute inset-0 z-20 flex items-center justify-center bg-green-500/80 text-white font-medium pointer-events-none'>
                    Поместить сюда
                </div>
            )}

            {image ? (
                <div
                    ref={setDraggableRef}
                    style={dndStyle}
                    {...listeners}
                    {...attributes}
                    className='w-full h-full cursor-grab active:cursor-grabbing group touch-none rounded-lg overflow-hidden'
                >
                    {/* Фото в слоте: R2/blob-URL, размеры неизвестны,
                        пропорции задаёт контейнер слота. */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={image.url}
                        alt={`Фото в слоте ${slotIndex}`}
                        className='w-full h-full object-cover pointer-events-none select-none rounded-lg'
                        draggable={false}
                    />

                    <button
                        type='button'
                        onClick={handleReplaceClick}
                        className='absolute top-2 right-2 opacity-0 group-hover:opacity-100 bg-white/90 hover:bg-white p-1.5 rounded shadow-sm transition-opacity z-30 cursor-pointer'
                        aria-label='Заменить фото'
                    >
                        <RefreshCw className='h-4 w-4 text-slate-700' />
                    </button>

                    <div className='absolute top-2 left-2 opacity-0 group-hover:opacity-100 bg-white/90 p-1 rounded shadow-sm transition-opacity z-30 pointer-events-none'>
                        <GripVertical className='h-4 w-4 text-slate-500' />
                    </div>
                </div>
            ) : (
                <div className='flex flex-col items-center justify-center w-full h-full text-[var(--md-sys-color-on-surface-variant)] hover:text-[var(--md-sys-color-on-surface)] hover:bg-[var(--md-sys-color-surface-variant)]/30 cursor-pointer transition-colors p-2'>
                    <Upload className='h-6 w-6 mb-1 opacity-60' />
                    <span className='text-sm font-medium'>Пустой слот</span>
                    <span className='text-xs opacity-70 mt-0.5'>
                        Нажмите или перетащите файл
                    </span>
                </div>
            )}
        </div>
    );
}
