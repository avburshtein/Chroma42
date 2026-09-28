'use client';

import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Input } from './Input';
import { cn } from '@/lib/utils';

/**
 * Поле пароля с кнопкой «глаз»: пользователь может проверить, что
 * напечатал. Опечатка в пароле — самая частая причина неудачного входа,
 * поэтому возможность проверить ввод обязательна.
 *
 * Ref и обработчики пробрасываются в `Input`, поэтому компонент работает
 * с react-hook-form: `<PasswordInput {...register('password')} />`.
 */
const PasswordInput = React.forwardRef<
    HTMLInputElement,
    React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => {
    const [visible, setVisible] = useState(false);

    return (
        <div className='relative'>
            <Input
                {...props}
                ref={ref}
                // type всегда после {...props}: переключатель не должен
                // затираться переданным извне значением
                type={visible ? 'text' : 'password'}
                className={cn('pr-11 font-mono', className)}
            />
            {/* 40×40 — зона клика по размеру самого поля (Input h-10) */}
            <button
                type='button'
                // type="button" обязателен: по умолчанию кнопка в форме
                // отправляет её, и клик по «глазу» сабмитил бы форму
                onClick={() => setVisible((v) => !v)}
                aria-label={visible ? 'Скрыть пароль' : 'Показать пароль'}
                aria-pressed={visible}
                title={visible ? 'Скрыть пароль' : 'Показать пароль'}
                className='absolute right-0 top-0 inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-md text-on-surface-variant transition-colors hover:bg-surface-variant focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary'
            >
                {visible ? (
                    <EyeOff className='h-4 w-4' />
                ) : (
                    <Eye className='h-4 w-4' />
                )}
            </button>
        </div>
    );
});
PasswordInput.displayName = 'PasswordInput';

export { PasswordInput };
export default PasswordInput;
