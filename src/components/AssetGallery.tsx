'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { Input } from '@/components/ui/Input';
import { GripVertical, Trash2 } from 'lucide-react';

type Asset = {
    id: string;
    file: { r2Key: string; mimeType: string };
    assetType: 'moodboard' | 'wireframe' | 'final_gallery';
    caption: string | null;
    order: number;
};

type AssetGalleryProps = {
    assets: Asset[];
    onReorder: (orderedIds: string[]) => void;
    onDelete: (assetId: string) => void;
    onEditCaption: (assetId: string, caption: string) => void;
    readonly?: boolean;
};

const TABS = [
    { value: 'all', label: 'All' },
    { value: 'moodboard', label: 'Moodboard' },
    { value: 'wireframe', label: 'Wireframe' },
    { value: 'final_gallery', label: 'Final' },
] as const;

export default function AssetGallery({
    assets,
    onReorder,
    onDelete,
    onEditCaption,
    readonly = false,
}: AssetGalleryProps) {
    const [activeTab, setActiveTab] = useState('all');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editValue, setEditValue] = useState('');
    const [dragIndex, setDragIndex] = useState<number | null>(null);

    const filteredAssets =
        activeTab === 'all'
            ? [...assets].sort((a, b) => a.order - b.order)
            : assets
                  .filter((a) => a.assetType === activeTab)
                  .sort((a, b) => a.order - b.order);

    const getImageUrl = (r2Key: string) => `/r2/${r2Key}`;

    const handleDragStart = (index: number) => {
        if (readonly) return;
        setDragIndex(index);
    };

    const handleDragOver = (e: React.DragEvent, index: number) => {
        e.preventDefault();
        if (readonly || dragIndex === null || dragIndex === index) return;

        const newAssets = [...filteredAssets];
        const [dragged] = newAssets.splice(dragIndex, 1);
        newAssets.splice(index, 0, dragged);
        onReorder(newAssets.map((a) => a.id));
        setDragIndex(index);
    };

    const handleDragEnd = () => {
        setDragIndex(null);
    };

    const startEditing = (asset: Asset) => {
        setEditingId(asset.id);
        setEditValue(asset.caption ?? '');
    };

    const saveCaption = (assetId: string) => {
        onEditCaption(assetId, editValue);
        setEditingId(null);
        setEditValue('');
    };

    const handleCaptionKeyDown = (
        e: React.KeyboardEvent<HTMLInputElement>,
        assetId: string,
    ) => {
        if (e.key === 'Enter') {
            saveCaption(assetId);
        } else if (e.key === 'Escape') {
            setEditingId(null);
            setEditValue('');
        }
    };

    if (assets.length === 0) {
        return (
            <div className='flex flex-col items-center justify-center gap-2 py-12 text-[var(--md-sys-color-on-surface-variant)]'>
                <p className='text-body-md'>No assets yet</p>
                <p className='text-body-sm'>Upload images to see them here.</p>
            </div>
        );
    }

    return (
        <div className='space-y-4'>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList>
                    {TABS.map((tab) => (
                        <TabsTrigger key={tab.value} value={tab.value}>
                            {tab.label}
                        </TabsTrigger>
                    ))}
                </TabsList>
            </Tabs>

            <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4'>
                {filteredAssets.map((asset, index) => (
                    <div
                        key={asset.id}
                        draggable={!readonly}
                        onDragStart={() => handleDragStart(index)}
                        onDragOver={(e) => handleDragOver(e, index)}
                        onDragEnd={handleDragEnd}
                        className={cn(
                            'group relative rounded-lg border border-[var(--md-sys-color-outline-variant)] bg-[var(--md-sys-color-surface)] overflow-hidden',
                            !readonly && 'cursor-grab active:cursor-grabbing',
                            dragIndex === index && 'opacity-50',
                        )}
                        role='listitem'
                    >
                        <div className='aspect-square relative overflow-hidden'>
                            {/* Ассет из R2 по ключу; размеры неизвестны на
                                этапе рендера, пропорции задаёт aspect-square. */}
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={getImageUrl(asset.file.r2Key)}
                                alt={asset.caption ?? 'Asset'}
                                className='h-full w-full object-cover'
                                loading='lazy'
                            />
                        </div>

                        {!readonly && (
                            <div className='absolute top-1 left-1 opacity-0 group-hover:opacity-100 transition-opacity'>
                                <GripVertical className='h-4 w-4 text-white drop-shadow-md' />
                            </div>
                        )}

                        {!readonly && (
                            <div className='absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1'>
                                <button
                                    type='button'
                                    onClick={() => onDelete(asset.id)}
                                    className='flex h-6 w-6 items-center justify-center rounded-full bg-[var(--md-sys-color-error)] text-[var(--md-sys-color-on-error)] shadow-md hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[var(--md-sys-color-primary)]'
                                    aria-label={`Delete asset ${asset.caption ?? ''}`}
                                >
                                    <Trash2 className='h-3.5 w-3.5' />
                                </button>
                            </div>
                        )}

                        <div className='p-2'>
                            {editingId === asset.id ? (
                                <Input
                                    value={editValue}
                                    onChange={(e) =>
                                        setEditValue(e.target.value)
                                    }
                                    onBlur={() => saveCaption(asset.id)}
                                    onKeyDown={(e) =>
                                        handleCaptionKeyDown(e, asset.id)
                                    }
                                    placeholder='Add caption...'
                                    className='text-body-sm'
                                    autoFocus
                                />
                            ) : (
                                <button
                                    type='button'
                                    onClick={() =>
                                        !readonly && startEditing(asset)
                                    }
                                    className={cn(
                                        'w-full text-left text-body-sm text-[var(--md-sys-color-on-surface)] truncate',
                                        !readonly &&
                                            'hover:text-[var(--md-sys-color-primary)] cursor-text',
                                    )}
                                    disabled={readonly}
                                    aria-label={
                                        asset.caption
                                            ? `Caption: ${asset.caption}. Click to edit.`
                                            : 'Add caption'
                                    }
                                >
                                    {asset.caption || (
                                        <span className='text-[var(--md-sys-color-on-surface-variant)] italic'>
                                            {readonly ? '' : 'Add caption...'}
                                        </span>
                                    )}
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
