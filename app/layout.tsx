import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
    title: 'Chroma42 — аудит-панель',
    description:
        'Генератор цветовых токенов OKLCH с проверяемой методологией доступности',
};

export default function RootLayout({
    children,
}: Readonly<{ children: React.ReactNode }>) {
    return (
        <html lang="ru" data-theme="light-normal">
            <body>{children}</body>
        </html>
    );
}
