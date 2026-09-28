'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import AdminGridEditor from './AdminGridEditor';
import type { GridImage } from './GridSlot';

interface MoodboardGridSectionProps {
    presetId: string | null;
    initialImages?: GridImage[];
    onImagesChange?: (images: GridImage[]) => void;
    onPresetChange?: (presetId: string) => void;
}

export default function MoodboardGridSection({
    presetId,
    initialImages = [],
    onImagesChange,
    onPresetChange,
}: MoodboardGridSectionProps) {
    const [images, setImages] = useState<GridImage[]>(initialImages);
    const isInitialMount = useRef(true);

    // Синхронизируем initialImages -> images (только при изменении извне)
    useEffect(() => {
        setImages(initialImages);
    }, [initialImages]);

    // Уведомляем родителя об изменениях images (но не при initial mount)
    useEffect(() => {
        if (isInitialMount.current) {
            isInitialMount.current = false;
            return;
        }
        onImagesChange?.(images);
    }, [images, onImagesChange]);

    const handleImagesChange = useCallback((newImages: GridImage[]) => {
        setImages(newImages);
    }, []);

    const handlePresetChange = useCallback(
        (newPresetId: string) => {
            onPresetChange?.(newPresetId);
        },
        [onPresetChange],
    );

    const handleFileUpload = useCallback(
        async (file: File, slotIndex: number) => {
            const objectUrl = URL.createObjectURL(file);
            const tempId = `img-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

            const tempImage: GridImage = {
                id: tempId,
                url: objectUrl,
                slotIndex,
                file,
            };

            setImages((prev) => {
                const filtered = prev.filter(
                    (img) => img.slotIndex !== slotIndex,
                );
                return [...filtered, tempImage];
            });

            try {
                const formData = new FormData();
                formData.append('file', file);

                const xhr = new XMLHttpRequest();
                const result = await new Promise<{
                    fileId: string;
                    r2Key: string;
                }>((resolve, reject) => {
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

                setImages((prev) =>
                    prev.map((img) =>
                        img.id === tempId
                            ? {
                                  ...img,
                                  fileId: result.fileId,
                                  url: `/r2/${result.r2Key}`,
                                  file: undefined,
                              }
                            : img,
                    ),
                );
            } catch (err) {
                console.error('Upload error:', err);
            }
        },
        [],
    );

    return (
        <AdminGridEditor
            presetId={presetId}
            initialImages={images}
            onImagesChange={handleImagesChange}
            onPresetChange={handlePresetChange}
            onFileUpload={handleFileUpload}
        />
    );
}
