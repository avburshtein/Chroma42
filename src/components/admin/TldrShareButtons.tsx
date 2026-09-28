'use client';

import { useState } from 'react';
import { Check, Link2, FileText, Printer } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';

interface TldrShareButtonsProps {
    /** URL короткой версии: /u/[slug]/[projectSlug]/short */
    shortUrl: string;
    /** Полный путь для target=«_blank» превью */
    previewHref: string;
}

/**
 * Кнопки распространения TL;DR на Review-шаге визарда:
 * «Открыть TL;DR» (превью в новой вкладке) + «Скопировать короткую ссылку»
 * (clipboard API + toast «Скопировано»). Решение 2026-09-18 (63).
 */
export function TldrShareButtons({ shortUrl, previewHref }: TldrShareButtonsProps) {
    const [copied, setCopied] = useState(false);

    const copyLink = async () => {
        try {
            await navigator.clipboard.writeText(shortUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2500);
        } catch {
            // Fallback для старых браузеров / небезопасного контекста
            const ta = document.createElement('textarea');
            ta.value = shortUrl;
            ta.style.position = 'fixed';
            ta.style.opacity = '0';
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
            setCopied(true);
            setTimeout(() => setCopied(false), 2500);
        }
    };

    return (
        <div className='flex flex-wrap items-center gap-3'>
            <Link href={previewHref} target='_blank' rel='noopener noreferrer'>
                <Button type='button' variant='outline'>
                    <FileText className='h-4 w-4' aria-hidden='true' />
                    Открыть TL;DR
                </Button>
            </Link>
            <Button
                type='button'
                variant='ghost'
                onClick={copyLink}
                aria-label='Скопировать короткую ссылку'
            >
                {copied ? (
                    <>
                        <Check
                            className='h-4 w-4 text-primary'
                            aria-hidden='true'
                        />
                        <span className='text-primary'>Скопировано</span>
                    </>
                ) : (
                    <>
                        <Link2 className='h-4 w-4' aria-hidden='true' />
                        Скопировать короткую ссылку
                    </>
                )}
            </Button>
            {/* PDF — print-CSS версия TL;DR: открываем /short?print=1,
                там диалог печати открывается сам (PrintTldrButton) */}
            <Link
                href={`${previewHref}?print=1`}
                target='_blank'
                rel='noopener noreferrer'
            >
                <Button type='button' variant='outline'>
                    <Printer className='h-4 w-4' aria-hidden='true' />
                    Скачать PDF
                </Button>
            </Link>
        </div>
    );
}
