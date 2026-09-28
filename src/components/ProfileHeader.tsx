import React from 'react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/Avatar';
import { MapPin, Globe } from 'lucide-react';
import { SocialIcon } from '@/components/SocialIcon';

type ProfileHeaderProps = {
    profile: {
        fullName: string;
        headline: string | null;
        bio: string | null;
        location: string | null;
        website: string | null;
        avatarFile: { r2Key: string } | null;
        coverFile: { r2Key: string } | null;
        socialLinks: Array<{
            platform: string;
            title: string;
            url: string;
        }>;
    };
};

const ASSET_DOMAIN = 'https://assets.ux42.studio';

function getImageUrl(r2Key: string): string {
    return `${ASSET_DOMAIN}/${r2Key}`;
}

function getInitials(name: string): string {
    return name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
}

export default function ProfileHeader({ profile }: ProfileHeaderProps) {
    return (
        <header
            className='relative'
            aria-label={`${profile.fullName}'s profile`}
        >
            {/* Cover */}
            <div className='relative h-48 sm:h-64 w-full overflow-hidden rounded-b-xl'>
                {profile.coverFile ? (
                    // Обложка из R2 по ключу (/r2/<key>): размеры неизвестны
                    // на этапе рендера, next/image неприменим. Изображение
                    // декоративное (пустой alt + aria-hidden), LCP не несёт.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={getImageUrl(profile.coverFile.r2Key)}
                        alt=''
                        className='h-full w-full object-cover'
                        aria-hidden='true'
                    />
                ) : (
                    <div className='h-full w-full bg-gradient-to-br from-[var(--md-sys-color-primary-container)] to-[var(--md-sys-color-secondary-container)]' />
                )}
            </div>

            {/* Avatar */}
            <div className='absolute left-1/2 -translate-x-1/2 -bottom-12 sm:left-8 sm:translate-x-0'>
                <Avatar className='h-24 w-24 border-4 border-[var(--md-sys-color-surface)] shadow-lg'>
                    {profile.avatarFile ? (
                        <AvatarImage
                            src={getImageUrl(profile.avatarFile.r2Key)}
                            alt={profile.fullName}
                        />
                    ) : null}
                    <AvatarFallback className='text-title-lg'>
                        {getInitials(profile.fullName)}
                    </AvatarFallback>
                </Avatar>
            </div>

            {/* Info */}
            <div className='mt-14 sm:mt-4 sm:ml-36 px-4 sm:px-8 pb-6 space-y-3'>
                <div>
                    <h1 className='text-headline-sm text-[var(--md-sys-color-on-surface)]'>
                        {profile.fullName}
                    </h1>
                    {profile.headline && (
                        <p className='text-title-md text-[var(--md-sys-color-on-surface-variant)] mt-1'>
                            {profile.headline}
                        </p>
                    )}
                </div>

                {profile.bio && (
                    <p className='text-body-md text-[var(--md-sys-color-on-surface)] max-w-prose'>
                        {profile.bio}
                    </p>
                )}

                <div className='flex flex-wrap items-center gap-4 text-body-sm text-[var(--md-sys-color-on-surface-variant)]'>
                    {profile.location && (
                        <span className='flex items-center gap-1'>
                            <MapPin className='h-4 w-4' aria-hidden='true' />
                            {profile.location}
                        </span>
                    )}
                    {profile.website && (
                        <a
                            href={
                                profile.website.startsWith('http')
                                    ? profile.website
                                    : `https://${profile.website}`
                            }
                            target='_blank'
                            rel='noopener noreferrer'
                            className='flex items-center gap-1 hover:text-[var(--md-sys-color-primary)] transition-colors'
                            aria-label={`Website: ${profile.website}`}
                        >
                            <Globe className='h-4 w-4' aria-hidden='true' />
                            {profile.website.replace(/^https?:\/\//, '')}
                        </a>
                    )}
                </div>

                {profile.socialLinks.length > 0 && (
                    <nav
                        className='flex items-center gap-3 pt-1'
                        aria-label='Social links'
                    >
                        {profile.socialLinks.map((link) => (
                            <a
                                key={`${link.platform}-${link.url}`}
                                href={link.url}
                                target='_blank'
                                rel='noopener noreferrer'
                                className='flex items-center gap-1.5 text-primary transition-opacity hover:opacity-70'
                                aria-label={`${link.title} (${link.platform})`}
                                title={link.title}
                            >
                                <SocialIcon platform={link.platform} url={link.url} />
                            </a>
                        ))}
                    </nav>
                )}
            </div>
        </header>
    );
}
