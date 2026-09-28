'use client';

import React, {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';

type ImageCropperDialogProps = {
    /** Object URL исходного изображения (не SVG). Освобождает вызывающий. */
    src: string;
    /**
     * Целевая пропорция кадра (width / height). Задана — рамка держит
     * пропорцию слота (аватар/обложка/OG). Не задана — «свободный»
     * режим: рамка = пропорция самого изображения, зумом выбирается
     * любой фрагмент той же пропорции (кейс-галереи без фикс. слотов).
     */
    aspectRatio?: number;
    /** Исходный MIME (png/webp сохраняют тип, остальное → jpeg). */
    fileType: string;
    onApply: (croppedBlob: Blob) => void;
    onCancel: () => void;
};

/** Максимальная сторона экспортируемого изображения, px. */
const EXPORT_MAX_SIDE = 1600;
/** Максимальный зум относительно масштаба «вписать целиком». */
const ZOOM_MAX_FACTOR = 4;
/** Шаг панорамирования стрелками клавиатуры, px. */
const KEY_PAN_STEP = 24;
/** Высота окна кадрирования, px. */
const VIEWPORT_H = 420;
/** Резервный размер окна, пока контейнер не измерен. */
const FALLBACK_VP = { w: 528, h: VIEWPORT_H };

/**
 * Диалог кадрирования изображения перед загрузкой. Модель «вписать и
 * выделить»: изначально видно ВСЁ изображение, белая рамка — крупнейший
 * вписанный прямоугольник с пропорцией слота, области за рамкой приглушены.
 * Зум от «вписанного» до 4×, панорамирование перетаскиванием (рамка всегда
 * накрыта изображением). «Применить» рисует выбранную область в canvas
 * и отдаёт Blob — в R2 уезжает уже кадрированное изображение, поэтому
 * публичный рендер (object-cover) совпадает с превью в админке.
 *
 * Надёжность: размеры берутся из предзагрузки (new Image()), картинка
 * позиционируется явными px (без CSS-transform), все сбои загрузки
 * показываются текстом в диалоге, а не пустым окном.
 */
export default function ImageCropperDialog({
    src,
    aspectRatio,
    fileType,
    onApply,
    onCancel,
}: ImageCropperDialogProps) {
    const viewportRef = useRef<HTMLDivElement>(null);
    // Предзагруженное изображение — источник размеров и объект для canvas
    const imgElRef = useRef<HTMLImageElement | null>(null);
    const dragRef = useRef<{
        pointerId: number;
        startX: number;
        startY: number;
        offsetX: number;
        offsetY: number;
    } | null>(null);

    const [imgSize, setImgSize] = useState<{ w: number; h: number } | null>(
        null,
    );
    const [loadError, setLoadError] = useState(false);
    const [vpSize, setVpSize] = useState({ w: 0, h: 0 });
    const [zoomPct, setZoomPct] = useState(0);
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Предзагрузка изображения: натуральные размеры + элемент для drawImage
    useEffect(() => {
        setImgSize(null);
        setLoadError(false);
        setZoomPct(0);
        setOffset({ x: 0, y: 0 });
        const img = new Image();
        imgElRef.current = img;
        img.onload = () => {
            if (imgElRef.current !== img) return;
            const w = img.naturalWidth;
            const h = img.naturalHeight;
            if (!w || !h) {
                setLoadError(true);
                return;
            }
            setImgSize({ w, h });
        };
        img.onerror = () => {
            if (imgElRef.current === img) setLoadError(true);
        };
        img.src = src;
        return () => {
            img.onload = null;
            img.onerror = null;
            if (imgElRef.current === img) imgElRef.current = null;
        };
    }, [src]);

    // Измерение окна кадрирования
    useEffect(() => {
        const el = viewportRef.current;
        if (!el) return;
        const update = () =>
            setVpSize({ w: el.clientWidth, h: el.clientHeight });
        update();
        const ro = new ResizeObserver(update);
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    // Размер окна: измеренный, либо резервный (деление на ноль исключено)
    const vp = vpSize.w > 0 && vpSize.h > 0 ? vpSize : FALLBACK_VP;

    /** Рамка кадра + масштаб «вписать целиком» (k). */
    const frame = useMemo(() => {
        if (!imgSize) return null;
        // Пропорция кадра: слотовая (aspectRatio) либо самого изображения
        // (свободный режим — рамка равна пропорции исходника)
        const ratio = aspectRatio ?? imgSize.w / imgSize.h;
        const k = Math.min(vp.w / imgSize.w, vp.h / imgSize.h);
        const dispW = imgSize.w * k;
        const dispH = imgSize.h * k;
        // Крупнейший вписанный прямоугольник пропорции ratio
        const fh = Math.min(dispH, dispW / ratio);
        return { w: fh * ratio, h: fh, k };
    }, [imgSize, vp, aspectRatio]);

    // Текущий масштаб: от «вписанного» (zoom 0) до ZOOM_MAX_FACTOR ×
    const scale = frame
        ? frame.k * (1 + (ZOOM_MAX_FACTOR - 1) * (zoomPct / 100))
        : 1;

    /** Ограничивает смещение: рамка всегда накрыта изображением. */
    const clampOffset = useCallback(
        (next: { x: number; y: number }, sc: number) => {
            if (!imgSize || !frame) return next;
            const maxX = Math.max(0, (imgSize.w * sc - frame.w) / 2);
            const maxY = Math.max(0, (imgSize.h * sc - frame.h) / 2);
            return {
                x: Math.min(maxX, Math.max(-maxX, next.x)),
                y: Math.min(maxY, Math.max(-maxY, next.y)),
            };
        },
        [imgSize, frame],
    );

    // При смене масштаба зажимаем смещение
    useEffect(() => {
        setOffset((prev) => clampOffset(prev, scale));
    }, [clampOffset, scale]);

    // Zoom колесом мыши (passive:false — нужен preventDefault)
    useEffect(() => {
        const el = viewportRef.current;
        if (!el) return;
        const onWheel = (e: WheelEvent) => {
            e.preventDefault();
            setZoomPct((prev) =>
                Math.min(100, Math.max(0, prev + (e.deltaY > 0 ? -6 : 6))),
            );
        };
        el.addEventListener('wheel', onWheel, { passive: false });
        return () => el.removeEventListener('wheel', onWheel);
    }, []);

    const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.currentTarget.setPointerCapture(e.pointerId);
        dragRef.current = {
            pointerId: e.pointerId,
            startX: e.clientX,
            startY: e.clientY,
            offsetX: offset.x,
            offsetY: offset.y,
        };
        setIsDragging(true);
    };

    const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
        const drag = dragRef.current;
        if (!drag || drag.pointerId !== e.pointerId) return;
        setOffset(
            clampOffset(
                {
                    x: drag.offsetX + (e.clientX - drag.startX),
                    y: drag.offsetY + (e.clientY - drag.startY),
                },
                scale,
            ),
        );
    };

    const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
        if (dragRef.current?.pointerId !== e.pointerId) return;
        dragRef.current = null;
        setIsDragging(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
        const delta = {
            ArrowLeft: { x: -KEY_PAN_STEP, y: 0 },
            ArrowRight: { x: KEY_PAN_STEP, y: 0 },
            ArrowUp: { x: 0, y: -KEY_PAN_STEP },
            ArrowDown: { x: 0, y: KEY_PAN_STEP },
        }[e.key];
        if (!delta) return;
        e.preventDefault();
        setOffset((prev) =>
            clampOffset({ x: prev.x + delta.x, y: prev.y + delta.y }, scale),
        );
    };

    /** Рисует выбранную область в canvas и отдаёт Blob с кадром. */
    const handleApply = async () => {
        const img = imgElRef.current;
        if (!img || !imgSize || !frame) {
            setError('Изображение ещё не загрузилось, подождите секунду.');
            return;
        }
        setExporting(true);
        setError(null);
        try {
            // Область кадра в координатах исходного изображения
            const cropW = frame.w / scale;
            const cropH = frame.h / scale;
            const sx =
                ((imgSize.w * scale - frame.w) / 2 - offset.x) / scale;
            const sy =
                ((imgSize.h * scale - frame.h) / 2 - offset.y) / scale;

            // Выходной размер: не больше оригинала и EXPORT_MAX_SIDE
            const down = Math.min(
                1,
                EXPORT_MAX_SIDE / cropW,
                EXPORT_MAX_SIDE / cropH,
            );
            const outW = Math.max(1, Math.round(cropW * down));
            const outH = Math.max(1, Math.round(cropH * down));

            const canvas = document.createElement('canvas');
            canvas.width = outW;
            canvas.height = outH;
            const ctx = canvas.getContext('2d');
            if (!ctx) throw new Error('Canvas is not supported');
            ctx.drawImage(img, sx, sy, cropW, cropH, 0, 0, outW, outH);

            // PNG/WebP сохраняют тип (прозрачность), остальное → JPEG
            const type =
                fileType === 'image/png' || fileType === 'image/webp'
                    ? fileType
                    : 'image/jpeg';
            const blob = await new Promise<Blob | null>((resolve) =>
                canvas.toBlob(resolve, type, 0.92),
            );
            if (!blob) throw new Error('Failed to export image');
            onApply(blob);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Cropping failed');
        } finally {
            setExporting(false);
        }
    };

    // Явные px-размеры и позиция картинки (без CSS-transform)
    const dispW = imgSize ? imgSize.w * scale : 0;
    const dispH = imgSize ? imgSize.h * scale : 0;
    const imgLeft = (vp.w - dispW) / 2 + offset.x;
    const imgTop = (vp.h - dispH) / 2 + offset.y;

    return (
        <Dialog open onOpenChange={(open) => !open && onCancel()}>
            <DialogContent className='max-w-xl'>
                <DialogHeader>
                    <DialogTitle>Кадрирование изображения</DialogTitle>
                    <DialogDescription>
                        Сразу видно всё фото: рамка — то, что попадёт в кадр.
                        Перетащите фото, масштаб — слайдером, колесом мыши
                        или стрелками.
                    </DialogDescription>
                </DialogHeader>

                <div
                    ref={viewportRef}
                    role='application'
                    aria-label='Crop area'
                    tabIndex={0}
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerCancel={handlePointerUp}
                    onKeyDown={handleKeyDown}
                    style={{ height: VIEWPORT_H }}
                    className={`relative w-full touch-none select-none overflow-hidden rounded-lg bg-[var(--md-sys-color-surface-variant)] focus:outline-none focus:ring-2 focus:ring-[var(--md-sys-color-primary)] ${
                        isDragging ? 'cursor-grabbing' : 'cursor-grab'
                    }`}
                >
                    {imgSize && (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                            src={src}
                            alt=''
                            draggable={false}
                            style={{
                                left: imgLeft,
                                top: imgTop,
                                width: dispW,
                                height: dispH,
                            }}
                            className='absolute max-w-none select-none'
                        />
                    )}
                    {frame && (
                        <div
                            aria-hidden='true'
                            style={{
                                left: (vp.w - frame.w) / 2,
                                top: (vp.h - frame.h) / 2,
                                width: frame.w,
                                height: frame.h,
                                boxShadow:
                                    '0 0 0 9999px rgba(0, 0, 0, 0.45)',
                            }}
                            className='pointer-events-none absolute border-2 border-white'
                        />
                    )}
                </div>

                {!imgSize && !loadError && (
                    <p className='text-body-sm text-[var(--md-sys-color-on-surface-variant)]'>
                        Загрузка изображения…
                    </p>
                )}
                {loadError && (
                    <p
                        className='text-body-sm text-[var(--md-sys-color-error)]'
                        role='alert'
                    >
                        Не удалось загрузить изображение. Закройте окно и
                        выберите файл заново.
                    </p>
                )}

                <div className='flex items-center gap-3'>
                    <span
                        className='text-body-sm text-[var(--md-sys-color-on-surface-variant)]'
                        aria-hidden='true'
                    >
                        −
                    </span>
                    <input
                        type='range'
                        min={0}
                        max={100}
                        step={1}
                        value={zoomPct}
                        onChange={(e) => setZoomPct(Number(e.target.value))}
                        aria-label='Zoom'
                        className='h-2 w-full cursor-pointer accent-[var(--md-sys-color-primary)]'
                    />
                    <span
                        className='text-body-sm text-[var(--md-sys-color-on-surface-variant)]'
                        aria-hidden='true'
                    >
                        +
                    </span>
                </div>

                {error && (
                    <p
                        className='text-label-sm text-[var(--md-sys-color-error)]'
                        role='alert'
                    >
                        {error}
                    </p>
                )}

                <DialogFooter>
                    <Button
                        type='button'
                        variant='outline'
                        onClick={onCancel}
                        disabled={exporting}
                    >
                        Отмена
                    </Button>
                    <Button
                        type='button'
                        onClick={handleApply}
                        disabled={exporting || !imgSize}
                    >
                        {exporting ? 'Применяю…' : 'Применить'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
