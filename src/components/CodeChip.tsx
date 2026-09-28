'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { cn } from '@/lib/utils';

type CodeChipProps = {
    /** Значение, которое копируется (код инвайта и т.п.). */
    value: string;
    className?: string;
};

/**
 * Чип с кодом, который копируется по клику — как блоки кода в чатах
 * (Qwen и подобные): значение не нужно выделять мышью, нажал — готово.
 *
 * Нажатие подсвечивает чип и на 2 секунды показывает галочку; для
 * скринридера дублируется текстом в `role="status"`.
 */
export default function CodeChip({ value, className }: CodeChipProps) {
    const [copied, setCopied] = useState(false);
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(
        () => () => {
            if (timer.current) clearTimeout(timer.current);
        },
        [],
    );

    const copy = useCallback(async () => {
        try {
            await navigator.clipboard.writeText(value);
        } catch {
            // Фолбэк для контекстов без Clipboard API (http, старые браузеры)
            const helper = document.createElement('textarea');
            helper.value = value;
            helper.setAttribute('readonly', '');
            helper.style.position = 'fixed';
            helper.style.opacity = '0';
            document.body.appendChild(helper);
            helper.select();
            try {
                document.execCommand('copy');
            } catch {
                // Копирование недоступно — чип всё равно покажет обратную связь
            }
            document.body.removeChild(helper);
        }
        setCopied(true);
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => setCopied(false), 2000);
    }, [value]);

    return (
        <button
            type='button'
            onClick={copy}
            title='Нажмите, чтобы скопировать'
            data-copied={copied ? 'true' : 'false'}
            className={cn(
                'group inline-flex cursor-pointer items-center gap-2 rounded-lg border px-2.5 py-1.5 select-none',
                'font-mono text-body-sm leading-none text-on-surface transition-all duration-150',
                'border-outline-variant bg-surface-container-low',
                'hover:border-primary hover:bg-primary-container hover:text-on-primary-container',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
                'data-[copied=true]:scale-105 data-[copied=true]:border-primary data-[copied=true]:bg-primary data-[copied=true]:text-on-primary',
                className,
            )}
        >
            <span className='tracking-[0.12em]'>{value}</span>
            <span
                className='inline-flex opacity-70 transition-opacity group-hover:opacity-100'
                aria-hidden='true'
            >
                {copied ? (
                    <Check className='h-3.5 w-3.5' />
                ) : (
                    <Copy className='h-3.5 w-3.5' />
                )}
            </span>
            <span className='sr-only' role='status'>
                {copied ? 'Скопировано' : ''}
            </span>
        </button>
    );
}
