import { type ReactNode } from 'react';
import Title from './Title';
import { cn } from '@/lib/utils';

export default function PageTitle({
    children,
    className = '',
}: {
    children: ReactNode;
    className?: string;
}) {
    return (
        <Title tag='h1' className={cn('mb-8', className)}>
            {children}
        </Title>
    );
}
