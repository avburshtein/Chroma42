'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import FormBox from '@/components/ui/FormBox';
import { deleteMyAccount } from '@/lib/actions/account';

/**
 * Раздел «Account» в редакторе профиля: удаление учётной записи.
 *
 * Существует по требованию GDPR Art. 17 — субъект данных должен иметь
 * реальный способ реализовать право на удаление. Раньше способ был один:
 * написать письмо. Теперь удаление доступно самому пользователю.
 *
 * Операция необратима: удаляются аккаунт, профиль, все кейсы и все
 * загруженные изображения (включая файлы в R2). Поэтому подтверждение —
 * вводом email, а не просто кнопка.
 */
export default function DeleteAccountSection({ accountEmail }: { accountEmail: string }) {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [confirm, setConfirm] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    const matches = confirm.trim().toLowerCase() === accountEmail.trim().toLowerCase();

    async function onDelete() {
        if (!matches || busy) return;
        setBusy(true);
        setError(null);
        try {
            const res = await deleteMyAccount(confirm);
            if (res.error) {
                setError(res.error);
                setBusy(false);
                return;
            }
            // Сессия удалена вместе с аккаунтом — уводим на главную.
            router.push('/');
            router.refresh();
        } catch {
            setError('Не удалось удалить аккаунт. Попробуйте позже или напишите на privacy@ux42.studio.');
            setBusy(false);
        }
    }

    return (
        <div className='space-y-6'>
            <FormBox>
                <div className='flex items-start gap-3'>
                    <AlertTriangle
                        size={20}
                        className='mt-0.5 shrink-0 text-error'
                        aria-hidden='true'
                    />
                    <div className='space-y-2'>
                        <h2 className='text-title-lg text-on-surface'>
                            Delete your account
                        </h2>
                        <p className='text-body-sm text-on-surface-variant'>
                            Удаление аккаунта необратимо. Будут стёрты: учётная
                            запись, публичный профиль, все кейсы и все
                            загруженные изображения. Восстановить их будет
                            невозможно.
                        </p>
                        <p className='text-body-sm text-on-surface-variant'>
                            Если хотите просто скрыть портфолио, не удаляйте
                            аккаунт — его можно сделать приватным в разделе
                            Profile (снять галочку публикации).
                        </p>
                    </div>
                </div>

                {!open ? (
                    <div className='pt-2'>
                        <Button
                            type='button'
                            variant='outline'
                            onClick={() => setOpen(true)}
                        >
                            Delete account
                        </Button>
                    </div>
                ) : (
                    <div className='space-y-4 border-t border-outline-variant pt-4'>
                        <div className='space-y-2'>
                            <Label htmlFor='confirm-email'>
                                To confirm, type your account email:{' '}
                                <span className='font-mono text-body-sm'>
                                    {accountEmail}
                                </span>
                            </Label>
                            <Input
                                id='confirm-email'
                                type='email'
                                value={confirm}
                                onChange={(e) => setConfirm(e.target.value)}
                                placeholder={accountEmail}
                                autoComplete='off'
                            />
                        </div>

                        {error && (
                            <p role='alert' className='text-sm text-error'>
                                {error}
                            </p>
                        )}

                        <div className='flex flex-wrap gap-3'>
                            <Button
                                type='button'
                                onClick={onDelete}
                                disabled={!matches || busy}
                                className='bg-error text-on-error hover:opacity-90'
                            >
                                {busy
                                    ? 'Deleting…'
                                    : 'Delete permanently'}
                            </Button>
                            <Button
                                type='button'
                                variant='ghost'
                                onClick={() => {
                                    setOpen(false);
                                    setConfirm('');
                                    setError(null);
                                }}
                                disabled={busy}
                            >
                                Cancel
                            </Button>
                        </div>
                    </div>
                )}
            </FormBox>
        </div>
    );
}
