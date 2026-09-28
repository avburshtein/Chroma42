'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Input } from '../ui/Input';
import { PasswordInput } from '../ui/PasswordInput';
import { Label } from '../ui/Label';
import { Button } from '../ui/Button';

export default function LoginForm() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError(null);
        setLoading(true);
        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });

            if (res.ok) {
                router.push('/admin');
                return;
            }

            const data = (await res.json().catch(() => ({}))) as {
                message?: string;
            };
            setError(data?.message || 'Ошибка входа');
        } catch {
            // Сетевая ошибка: детали не логируем (иначе в консоль утекут
            // чувствительные данные ответа), показываем нейтральный текст.
            setError('Сетевая ошибка');
        } finally {
            setLoading(false);
        }
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
                <Label htmlFor='password'>Пароль</Label>
                <PasswordInput
                    id='password'
                    required
                    autoComplete='current-password'
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                />
            </div>
            {error && (
                <p role='alert' className='text-sm text-red-600'>
                    {error}
                </p>
            )}
            <div className='flex justify-end'>
                <Button type='submit' disabled={loading}>
                    {loading ? 'Загрузка...' : 'Войти'}
                </Button>
            </div>

            {/* RGPD Art. 13: вход тоже обрабатывает email (аутентификация).
                Уведомление + ссылка на политику. */}
            <p className='text-xs leading-relaxed text-on-surface-variant'>
                Вход использует email для аутентификации. Подробности об
                обработке данных — в{' '}
                <Link
                    href='/privacy'
                    className='text-primary underline decoration-1 underline-offset-2 transition-opacity hover:opacity-80'
                >
                    Политике конфиденциальности
                </Link>
                .
            </p>
        </form>
    );
}
