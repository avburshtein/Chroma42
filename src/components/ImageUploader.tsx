'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { Crop, Upload, X } from 'lucide-react';
import ImageCropperDialog from './ImageCropperDialog';

type ImageUploaderProps = {
    value: { fileId: string; r2Key: string } | null;
    onChange: (file: { fileId: string; r2Key: string } | null) => void;
    accept?: string;
    maxSize?: number;
    aspectRatio?: number;
    /**
     * Пропорция кадрирования (width / height). Если задана — перед
     * загрузкой открывается диалог кадрирования, в R2 уезжает уже
     * кадрированное изображение (пропорция = пропорции слота на странице).
     */
    cropRatio?: number;
    /**
     * Включить кадрирование без фикс. пропорции слота: рамка = пропорция
     * выбранного изображения, зум/пан выбирают фрагмент. Для галерей
     * кейса, где слоты не имеют фиксированного aspect.
     */
    crop?: boolean;
    compact?: boolean;
};

export default function ImageUploader({
    value,
    onChange,
    accept = 'image/*',
    maxSize = 10 * 1024 * 1024,
    aspectRatio,
    cropRatio,
    crop = false,
    compact = false,
}: ImageUploaderProps) {
    const [isDragging, setIsDragging] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    // Оригинал (до кадрирования) — для повторного кадрирования превью
    const originalFileRef = useRef<File | null>(null);
    const objectUrlRef = useRef<string | null>(null);
    const [cropping, setCropping] = useState<{ file: File; url: string } | null>(
        null,
    );

    // Освобождаем object URL при размонтировании
    useEffect(() => {
        return () => {
            if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
        };
    }, []);

    // validateFile вынесена в useCallback: uploadFile зависит от неё,
    // без стабилизации exhaustive-deps ругается на отсутствующий
    // зависимости элемент и эффект пересоздаётся на каждом рендере.
    const validateFile = useCallback(
        (file: File): string | null => {
            if (!file.type.startsWith('image/')) {
                return 'Please select an image file.';
            }
            if (file.size > maxSize) {
                const maxMB = Math.round(maxSize / (1024 * 1024));
                return `File size must be less than ${maxMB}MB.`;
            }
            return null;
        },
        [maxSize],
    );

    const uploadFile = useCallback(
        async (file: File) => {
            const validationError = validateFile(file);
            if (validationError) {
                setError(validationError);
                return;
            }

            setError(null);
            setIsUploading(true);
            setUploadProgress(0);

            const formData = new FormData();
            formData.append('file', file);

            try {
                const xhr = new XMLHttpRequest();

                const result = await new Promise<{
                    fileId: string;
                    r2Key: string;
                }>((resolve, reject) => {
                    xhr.upload.addEventListener('progress', (e) => {
                        if (e.lengthComputable) {
                            setUploadProgress(
                                Math.round((e.loaded / e.total) * 100),
                            );
                        }
                    });

                    xhr.addEventListener('load', () => {
                        if (xhr.status >= 200 && xhr.status < 300) {
                            try {
                                const data = JSON.parse(xhr.responseText);
                                resolve(data);
                            } catch {
                                reject(new Error('Invalid response'));
                            }
                        } else {
                            reject(
                                new Error(
                                    `Upload failed with status ${xhr.status}`,
                                ),
                            );
                        }
                    });

                    xhr.addEventListener('error', () =>
                        reject(new Error('Network error')),
                    );
                    xhr.addEventListener('abort', () =>
                        reject(new Error('Upload aborted')),
                    );

                    xhr.open('POST', '/api/upload');
                    xhr.send(formData);
                });

                onChange(result);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Upload failed');
            } finally {
                setIsUploading(false);
                setUploadProgress(0);
            }
        },
        // maxSize уже учтён внутри validateFile (useCallback) — прямой
        // зависимостью он больше не нужен.
        [onChange, validateFile],
    );

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) {
            startCropFlow(file);
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            startCropFlow(file);
        }
        if (inputRef.current) {
            inputRef.current.value = '';
        }
    };

    /**
     * Выбор файла: с crop/cropRatio — сначала диалог кадрирования (SVG
     * кадрируем как есть), без — сразу загрузка. Оригинал держим в ref
     * для re-crop.
     */
    const startCropFlow = (file: File) => {
        const cropEnabled = cropRatio !== undefined || crop;
        if (!cropEnabled || file.type === 'image/svg+xml') {
            uploadFile(file);
            return;
        }
        originalFileRef.current = file;
        if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
        const url = URL.createObjectURL(file);
        objectUrlRef.current = url;
        setError(null);
        setCropping({ file, url });
    };

    /** Повторное кадрирование: из оригинала в памяти или замена файла. */
    const handleRecrop = () => {
        const original = originalFileRef.current;
        if (original) {
            startCropFlow(original);
        } else {
            // После перезагрузки страницы оригинала нет — предлагаем
            // выбрать файл заново (после выбора откроется кадрирование)
            inputRef.current?.click();
        }
    };

    /** Кадр из диалога → File → обычная загрузка (upload endpoint). */
    const handleCropApply = (blob: Blob) => {
        const source = cropping?.file;
        const ext =
            blob.type === 'image/png'
                ? 'png'
                : blob.type === 'image/webp'
                  ? 'webp'
                  : 'jpg';
        const base = (source?.name ?? 'image').replace(/\.[^.]+$/, '');
        const file = new File([blob], `${base}-cropped.${ext}`, {
            type: blob.type,
        });
        setCropping(null);
        uploadFile(file);
    };

    const handleRemove = () => {
        onChange(null);
        setError(null);
    };

    const getImageUrl = (r2Key: string) => `/r2/${r2Key}`;

    return (
        <div className='space-y-2'>
            {value ? (
                <div className='relative inline-block'>
                    <div
                        className={cn(
                            'relative w-40 overflow-hidden rounded-lg border border-[var(--md-sys-color-outline-variant)]',
                            aspectRatio
                                ? `aspect-[${aspectRatio}]`
                                : 'aspect-video',
                        )}
                    >
                        {/* Ассет из R2 по ключу; размеры неизвестны на
                            этапе рендера, пропорции задаёт aspect-square. */}
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={getImageUrl(value.r2Key)}
                            alt='Uploaded image'
                            className='h-full w-full object-cover'
                        />
                    </div>
                    <button
                        type='button'
                        onClick={handleRemove}
                        className='absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-[var(--md-sys-color-error-container)] text-[var(--md-sys-color-on-error-container)] shadow-md hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-[var(--md-sys-color-primary)] cursor-pointer'
                        aria-label='Remove image'
                    >
                        <X className='h-3.5 w-3.5' />
                    </button>
                    {(cropRatio || crop) && (
                        <button
                            type='button'
                            onClick={handleRecrop}
                            title='Кадрировать'
                            aria-label='Crop image'
                            className='absolute -left-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-[var(--md-sys-color-surface-container)] text-[var(--md-sys-color-on-surface)] shadow-md hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-[var(--md-sys-color-primary)] cursor-pointer'
                        >
                            <Crop className='h-3.5 w-3.5' />
                        </button>
                    )}
                </div>
            ) : (
                <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => inputRef.current?.click()}
                    role='button'
                    tabIndex={0}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            inputRef.current?.click();
                        }
                    }}
                    aria-label='Upload image'
                    className={cn(
                        'flex items-center justify-center gap-2 rounded-lg border-2 border-dashed transition-colors cursor-pointer',
                        'bg-[var(--md-sys-color-surface-input)]',
                        // min-h-10 = высота ui/Input (h-10): в строках
                        // админки дропзона и поле caption на одной линии
                        compact ? 'min-h-10 p-2' : 'flex-col p-8',
                        isDragging
                            ? 'border-[var(--md-sys-color-primary)] bg-[var(--md-sys-color-primary-container)]/20'
                            : 'border-[var(--md-sys-color-outline-variant)] hover:border-[var(--md-sys-color-outline)]',
                    )}
                >
                    <Upload
                        className={cn(
                            'text-[var(--md-sys-color-on-surface-variant)]',
                            compact ? 'h-4 w-4' : 'h-8 w-8',
                        )}
                    />
                    <p
                        className={cn(
                            'text-[var(--md-sys-color-on-surface-variant)]',
                            compact ? 'text-label-sm' : 'text-body-sm',
                        )}
                    >
                        {compact
                            ? 'Drop image or click'
                            : 'Drag & drop an image here, or click to select'}
                    </p>
                    {!compact && (
                        <p className='text-label-sm text-[var(--md-sys-color-on-surface-variant)]'>
                            Max size: {Math.round(maxSize / (1024 * 1024))}MB
                        </p>
                    )}
                </div>
            )}

            <input
                ref={inputRef}
                type='file'
                accept={accept}
                onChange={handleFileSelect}
                className='hidden'
                aria-hidden='true'
            />

            {isUploading && (
                <div className='space-y-1'>
                    <div className='h-2 w-full overflow-hidden rounded-full bg-[var(--md-sys-color-surface-variant)]'>
                        <div
                            className='h-full rounded-full bg-[var(--md-sys-color-primary)] transition-all duration-300'
                            style={{ width: `${uploadProgress}%` }}
                            role='progressbar'
                            aria-valuenow={uploadProgress}
                            aria-valuemin={0}
                            aria-valuemax={100}
                            aria-label={`Upload progress: ${uploadProgress}%`}
                        />
                    </div>
                    <p className='text-label-sm text-[var(--md-sys-color-on-surface-variant)]'>
                        Uploading... {uploadProgress}%
                    </p>
                </div>
            )}

            {error && (
                <p
                    className='text-label-sm text-[var(--md-sys-color-error)]'
                    role='alert'
                >
                    {error}
                </p>
            )}

            {cropping && (cropRatio || crop) && (
                <ImageCropperDialog
                    src={cropping.url}
                    aspectRatio={cropRatio}
                    fileType={cropping.file.type}
                    onApply={handleCropApply}
                    onCancel={() => setCropping(null)}
                />
            )}
        </div>
    );
}
