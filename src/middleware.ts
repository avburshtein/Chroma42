import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { getDb } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { verifyJwt } from '@/lib/jwt';

export async function middleware(request: NextRequest) {
    const token = request.cookies.get('auth-token')?.value;
    const { pathname } = request.nextUrl;

    if (!token) {
        const loginUrl = new URL('/login', request.url);
        return NextResponse.redirect(loginUrl);
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
        console.error(
            '❌ [Middleware]: JWT_SECRET не найден в process.env. Проверьте .env.local',
        );
        return NextResponse.json(
            { error: 'JWT_SECRET is not configured' },
            { status: 500 },
        );
    }

    const payload = await verifyJwt(token, jwtSecret);
    if (!payload) {
        const loginUrl = new URL('/login', request.url);
        return NextResponse.redirect(loginUrl);
    }

    const { userId, role } = payload as {
        userId: string;
        email: string;
        role: string;
    };

    // Проверка блокировки пользователя
    try {
        const { env } = await getCloudflareContext();
        const db = getDb(env.DB);
        const user = await db
            .select({ isActive: users.isActive })
            .from(users)
            .where(eq(users.id, userId))
            .get();

        if (!user || !user.isActive) {
            const res = NextResponse.redirect(new URL('/login', request.url));
            res.cookies.delete('auth-token');
            return res;
        }
    } catch (err) {
        console.error('❌ [Middleware]: Ошибка проверки isActive', err);
    }

    // Проверка доступа к /super-admin/* — только admin
    if (pathname.startsWith('/super-admin') && role !== 'admin') {
        return NextResponse.redirect(new URL('/', request.url));
    }

    // Проверка доступа к /admin/* — user или admin
    if (pathname.startsWith('/admin') && role !== 'user' && role !== 'admin') {
        return NextResponse.redirect(new URL('/', request.url));
    }

    // Пробросить userId и role в заголовки
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-user-id', userId);
    requestHeaders.set('x-user-role', role);

    return NextResponse.next({
        request: {
            headers: requestHeaders,
        },
    });
}

export const config = {
    matcher: ['/admin/:path*', '/super-admin/:path*'],
};
