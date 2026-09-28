'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { PasswordInput } from '../ui/PasswordInput';
import { Label } from '../ui/Label';
import { Button } from '../ui/Button';
import { changePassword } from '@/lib/actions/auth';

const formSchema = z
    .object({
        currentPassword: z.string().min(1, 'Введите текущий пароль'),
        newPassword: z
            .string()
            .min(6, 'Новый пароль должен быть не менее 6 символов'),
        confirmPassword: z.string().min(1, 'Подтвердите новый пароль'),
    })
    .refine((data) => data.newPassword === data.confirmPassword, {
        message: 'Пароли не совпадают',
        path: ['confirmPassword'],
    });

type FormData = z.infer<typeof formSchema>;

export default function ChangePasswordForm() {
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm<FormData>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            currentPassword: '',
            newPassword: '',
            confirmPassword: '',
        },
    });

    const onSubmit = async (data: FormData) => {
        setSaving(true);
        setError(null);
        setSuccess(false);
        try {
            const result = await changePassword(
                data.currentPassword,
                data.newPassword,
            );
            if (result.success) {
                setSuccess(true);
                reset();
            } else {
                setError(result.error ?? 'Ошибка смены пароля');
            }
        } catch {
            setError('Сетевая ошибка');
        } finally {
            setSaving(false);
        }
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className='space-y-4'>
            <div>
                <Label htmlFor='currentPassword'>Текущий пароль</Label>
                <PasswordInput
                    id='currentPassword'
                    autoComplete='current-password'
                    {...register('currentPassword')}
                />
                {errors.currentPassword && (
                    <p className='mt-1 text-body-sm text-error'>
                        {errors.currentPassword.message}
                    </p>
                )}
            </div>

            <div>
                <Label htmlFor='newPassword'>Новый пароль</Label>
                <PasswordInput
                    id='newPassword'
                    autoComplete='new-password'
                    {...register('newPassword')}
                />
                {errors.newPassword && (
                    <p className='mt-1 text-body-sm text-error'>
                        {errors.newPassword.message}
                    </p>
                )}
            </div>

            <div>
                <Label htmlFor='confirmPassword'>Подтверждение пароля</Label>
                <PasswordInput
                    id='confirmPassword'
                    autoComplete='new-password'
                    {...register('confirmPassword')}
                />
                {errors.confirmPassword && (
                    <p className='mt-1 text-body-sm text-error'>
                        {errors.confirmPassword.message}
                    </p>
                )}
            </div>

            {error && <p className='text-body-sm text-error'>{error}</p>}
            {success && (
                <p className='text-body-sm text-primary'>
                    Пароль успешно изменён!
                </p>
            )}

            <div className='flex justify-end'>
                <Button type='submit' disabled={saving}>
                    {saving ? 'Сохранение...' : 'Сменить пароль'}
                </Button>
            </div>
        </form>
    );
}
