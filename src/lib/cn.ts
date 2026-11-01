import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Объединяет CSS-классы: clsx для условий, tailwind-merge для разрешения
 * конфликтов утилит. Тот же контракт, что и в ux42studio (`@/lib/utils`).
 */
export function cn(...inputs: ClassValue[]): string {
    return twMerge(clsx(inputs));
}
