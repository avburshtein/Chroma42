import React from 'react';
import { cn } from '@/lib/cn';
import { cva, type VariantProps } from 'class-variance-authority';

/**
 * Канон ux42studio, переведённый на токены Chroma42 (`--c42-*`).
 * Деструктивная кнопка использует error/on-error, а не контейнерную пару:
 * в светлой теме error-container/on-error-container давал всего 2.4:1.
 */
const buttonVariants = cva(
    'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--c42-focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--c42-surface)] disabled:pointer-events-none disabled:opacity-50 cursor-pointer',
    {
        variants: {
            variant: {
                default:
                    'bg-[var(--c42-primary)] text-[var(--c42-on-primary)] hover:opacity-90',
                destructive:
                    'bg-[var(--c42-error)] text-[var(--c42-on-error)] hover:opacity-90',
                outline:
                    'border border-[var(--c42-outline)] bg-transparent text-[var(--c42-on-surface)] hover:opacity-80',
                secondary:
                    'bg-[var(--c42-primary-container)] text-[var(--c42-on-primary-container)] hover:opacity-90',
                ghost: 'bg-transparent text-[var(--c42-on-surface)] hover:opacity-70',
            },
            size: {
                default: 'h-10 px-4 py-2',
                sm: 'h-9 rounded-md px-3',
                lg: 'h-11 rounded-md px-8',
                icon: 'h-10 w-10',
            },
        },
        defaultVariants: {
            variant: 'default',
            size: 'default',
        },
    },
);

export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement>,
        VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant, size, ...props }, ref) => {
        return (
            <button
                className={cn(buttonVariants({ variant, size, className }))}
                ref={ref}
                {...props}
            />
        );
    },
);
Button.displayName = 'Button';

export { Button, buttonVariants };
export default Button;
