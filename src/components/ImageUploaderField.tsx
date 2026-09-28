'use client';

import { useEffect, useState } from 'react';
import ImageUploader from './ImageUploader';
import { getFileR2Key } from '@/lib/actions/projects';

type UploadedFile = { fileId: string; r2Key: string };

type ImageUploaderFieldProps = {
    value?: string | null;
    onChange: (fileId: string | null) => void;
    accept?: string;
    maxSize?: number;
    aspectRatio?: number;
    /** Пропорция кадрирования перед загрузкой (обычно = aspectRatio). */
    cropRatio?: number;
    /** Кадрирование без фикс. пропорции (рамка = пропорция изображения). */
    crop?: boolean;
    compact?: boolean;
};

export default function ImageUploaderField({
    value,
    onChange,
    accept,
    maxSize,
    aspectRatio,
    cropRatio,
    crop,
    compact,
}: ImageUploaderFieldProps) {
    const [uploaded, setUploaded] = useState<UploadedFile | null>(null);
    const [existingR2Key, setExistingR2Key] = useState<string | null>(null);

    // Resolve the r2Key for an existing fileId so we can show a preview.
    // A fresh upload already carries its r2Key, so we only need this for
    // files loaded from the database (which store only the fileId).
    useEffect(() => {
        let cancelled = false;
        if (value) {
            getFileR2Key(value)
                .then((r2Key) => {
                    if (!cancelled) setExistingR2Key(r2Key);
                })
                .catch(() => {
                    if (!cancelled) setExistingR2Key(null);
                });
        } else {
            setExistingR2Key(null);
        }
        return () => {
            cancelled = true;
        };
    }, [value]);

    const activeValue: UploadedFile | null =
        uploaded ??
        (value && existingR2Key
            ? { fileId: value, r2Key: existingR2Key }
            : null);

    return (
        <ImageUploader
            value={activeValue}
            onChange={(file) => {
                setUploaded(file);
                onChange(file?.fileId ?? null);
            }}
            accept={accept}
            maxSize={maxSize}
            aspectRatio={aspectRatio}
            cropRatio={cropRatio}
            crop={crop}
            compact={compact}
        />
    );
}
