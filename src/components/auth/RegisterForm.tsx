'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Input } from '../ui/Input';
import { Label } from '../ui/Label';
import { Button } from '../ui/Button';

export default function RegisterForm({
    defaultInviteCode = '',
}: {
    /** Код из ссылки /register?invite=CODE — подставляется в поле. */
    defaultInviteCode?: string;
}) {
    const router = useRouter();
    const [email, setEmail] = useState('');
    // Код мог прийти в ссылке из письма-приглашения: /register?invite=CODE
    const [invite, setInvite] = useState(defaultInviteCode);
    const [error, setError] = useState<string | null>(null);
    const [createdPassword, setCreatedPassword] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const [loading, setLoading] = useState(false);

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError(null);
        setCreatedPassword(null);
        setLoading(true);
        try {
            const res = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, invite }),
            });

            const data = (await res.json().catch(() => ({}))) as {
                message?: string;
                password?: string;
                ok?: boolean;
            };

            if (res.ok) {
                if (data.password) {
                    setCreatedPassword(data.password);
                } else {
                    router.push('/admin');
                }
                return;
            }

            setError(data?.message || 'Ошибка регистрации');
        } catch {
            // Сетевая ошибка: детали не логируем (иначе в консоль утекут
            // чувствительные данные ответа), показываем нейтральный текст.
            setError('Сетевая ошибка');
        } finally {
            setLoading(false);
        }
    }

    const copyToClipboard = () => {
        if (!createdPassword) return;
        navigator.clipboard.writeText(createdPassword);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (createdPassword) {
        return (
            <div className='space-y-4 rounded-lg bg-emerald-50/50 p-6 border border-emerald-200 text-emerald-950'>
                <h3 className='font-semibold text-lg'>Регистрация завершена</h3>
                <p className='text-sm text-emerald-800'>
                    Сохраните сгенерированный пароль. Он потребуется для входа с других устройств:
                </p>
                
                <div className='flex items-center gap-2 bg-white p-3 rounded-md border border-emerald-300 font-mono text-base justify-between'>
                    <span className='font-bold select-all'>{createdPassword}</span>
                    <Button 
                        type='button' 
                        onClick={copyToClipboard}
                        className='text-xs px-3 py-1 h-auto bg-emerald-100 text-emerald-900 hover:bg-emerald-200 border-none'
                    >
                        {copied ? 'Скопировано!' : 'Скопировать'}
                    </Button>
                </div>

                <div className='space-y-2 border-t border-emerald-200 pt-4'>
                    <p className='text-sm font-semibold text-emerald-900'>
                        Что делать дальше
                    </p>
                    <ol className='space-y-1 text-sm text-emerald-800'>
                        <li>
                            Мы отправили письмо на {email} с этим же
                            планом — загляните в «Спам», если не нашли.
                        </li>
                        <li>
                            Смените пароль на удобный:{' '}
                            <Link
                                href='/admin/profile/password'
                                className='font-semibold text-emerald-900 underline decoration-1 underline-offset-2'
                            >
                                Настройки профиля → Изменить пароль
                            </Link>
                            .
                        </li>
                        <li>
                            Заполните «Настройки профиля» — это то, что
                            видят посетители вашей страницы.
                        </li>
                        <li>
                            Соберите первый кейс: «Ред. проекты» → «Новый
                            проект».
                        </li>
                    </ol>
                </div>

                <div className='pt-2 flex justify-end'>
                    <Button onClick={() => router.push('/admin')}>
                        Я сохранил пароль — Перейти в панель
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <form onSubmit={onSubmit} className='space-y-4'>
            <div>
                <Label htmlFor='email'>Email</Label>
                <Input
                    id='email'
                    type='email'
                    required
                    autoComplete='email'
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                />
            </div>
            <div>
                <Label htmlFor='invite'>Код инвайта</Label>
                <Input
                    id='invite'
                    required
                    autoComplete='off'
                    value={invite}
                    onChange={(e) => setInvite(e.target.value)}
                />
            </div>
            {error && (
                <p role='alert' className='text-sm text-red-600'>
                    {error}
                </p>
            )}
            <div className='flex justify-end'>
                <Button type='submit' disabled={loading}>
                    {loading ? 'Загрузка...' : 'Зарегистрироваться'}
                </Button>
            </div>

            {/* RGPD/LOPDGDD Art. 13: при регистрации собирается email, значит
                уведомление обязательно — цель, основание, срок хранения и
                контакт контролёра. Без него форма собирает ПДн, не информируя
                субъекта. Ссылка ведёт на /privacy (EN/ES, §1 и §4). */}
            <p className='text-xs leading-relaxed text-on-surface-variant'>
                Регистрируясь, вы предоставляете email для создания учётной
                записи и работы с платформой. Основания: исполнение договора
                (Art. 6.1.b RGPD) и законный интерес (Art. 6.1.f). Данные
                хранятся, пока аккаунт существует, и удаляются по запросу.
                Подробности — в{' '}
                <Link
                    href='/privacy'
                    className='text-primary underline decoration-1 underline-offset-2 transition-opacity hover:opacity-80'
                >
                    Политике конфиденциальности
                </Link>
                . Вопросы: privacy@ux42.studio
            </p>
        </form>
    );
}