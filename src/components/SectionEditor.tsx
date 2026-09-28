'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';

type SectionEditorProps = {
    projectId: string;
    sectionName: string;
    children: React.ReactNode;
    onSave: (data: unknown) => Promise<void>;
};

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export default function SectionEditor({
    projectId,
    sectionName,
    children,
    onSave,
}: SectionEditorProps) {
    const [status, setStatus] = useState<SaveStatus>('idle');
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const formRef = useRef<HTMLDivElement>(null);

    const handleBlur = useCallback(
        (e: React.FocusEvent<HTMLDivElement>) => {
            if (!formRef.current?.contains(e.relatedTarget as Node)) {
                if (debounceRef.current) {
                    clearTimeout(debounceRef.current);
                }
                debounceRef.current = setTimeout(async () => {
                    setStatus('saving');
                    try {
                        await onSave({ projectId, sectionName });
                        setStatus('saved');
                        setTimeout(() => setStatus('idle'), 3000);
                    } catch {
                        setStatus('error');
                    }
                }, 2000);
            }
        },
        [onSave, projectId, sectionName],
    );

    useEffect(() => {
        return () => {
            if (debounceRef.current) {
                clearTimeout(debounceRef.current);
            }
        };
    }, []);

    const statusIndicator = () => {
        switch (status) {
            case 'saving':
                return (
                    <span className='text-label-sm text-[var(--md-sys-color-on-surface-variant)] flex items-center gap-1'>
                        <svg
                            className='h-3 w-3 animate-spin'
                            xmlns='http://www.w3.org/2000/svg'
                            fill='none'
                            viewBox='0 0 24 24'
                            aria-hidden='true'
                        >
                            <circle
                                className='opacity-25'
                                cx='12'
                                cy='12'
                                r='10'
                                stroke='currentColor'
                                strokeWidth='4'
                            />
                            <path
                                className='opacity-75'
                                fill='currentColor'
                                d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z'
                            />
                        </svg>
                        Saving...
                    </span>
                );
            case 'saved':
                return (
                    <span className='text-label-sm text-[var(--md-sys-color-primary)]'>
                        ✓ Saved
                    </span>
                );
            case 'error':
                return (
                    <span className='text-label-sm text-[var(--md-sys-color-error)]'>
                        ✕ Error saving
                    </span>
                );
            default:
                return null;
        }
    };

    return (
        <div
            ref={formRef}
            className='space-y-4'
            onBlur={handleBlur}
            aria-label={`Section editor: ${sectionName}`}
        >
            <div className='flex items-center justify-between'>
                <h3 className='text-title-md text-[var(--md-sys-color-on-surface)]'>
                    {sectionName}
                </h3>
                {statusIndicator()}
            </div>
            {children}
        </div>
    );
}
