import Link from 'next/link';
import Image from 'next/image';

type ProjectCardProps = {
    project: {
        id: string;
        slug: string;
        title: string;
        teaser: string | null;
        coverFile: { r2Key: string; mimeType: string } | null;
        profile: { slug: string; fullName: string } | null;
        projectCategories: Array<{
            category: { name: string; slug: string } | null;
        }>;
    };
};

function getImageUrl(r2Key: string): string {
    return `/r2/${r2Key}`;
}

export default function ProjectCard({ project }: ProjectCardProps) {
    const href = `/u/${project.profile?.slug ?? 'unknown'}/${project.slug}`;
    const teaser = project.teaser
        ? project.teaser.length > 120
            ? project.teaser.slice(0, 120) + '…'
            : project.teaser
        : null;

    const validCategories = project.projectCategories
        .map((pc) => pc.category)
        .filter((c): c is { name: string; slug: string } => c !== null);

    return (
        <Link
            href={href}
            className='group block rounded-xl overflow-hidden bg-surface border border-outline-variant hover:shadow-lg transition-shadow'
        >
            <div className='aspect-[16/10] relative overflow-hidden bg-surface-variant'>
                {project.coverFile ? (
                    <Image
                        src={getImageUrl(project.coverFile.r2Key)}
                        alt={project.title}
                        fill
                        sizes='(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw'
                        className='object-cover group-hover:scale-105 transition-transform duration-300'
                    />
                ) : (
                    <div className='w-full h-full flex items-center justify-center text-on-surface-variant text-body-sm'>
                        Нет обложки
                    </div>
                )}
            </div>
            <div className='p-4 space-y-2'>
                <h3 className='text-title-md text-on-surface group-hover:text-primary transition-colors line-clamp-1'>
                    {project.title}
                </h3>
                {teaser && (
                    <p className='text-body-sm text-on-surface-variant line-clamp-2'>
                        {teaser}
                    </p>
                )}
                {project.profile && (
                    <p className='text-label-md text-on-surface-variant'>
                        {project.profile.fullName}
                    </p>
                )}
                {validCategories.length > 0 && (
                    <div className='flex flex-wrap gap-1.5 pt-1'>
                        {validCategories.map((cat) => (
                            <span
                                key={cat.slug}
                                className='inline-block px-2 py-0.5 rounded-full bg-primary-container text-on-primary-container text-label-sm'
                            >
                                {cat.name}
                            </span>
                        ))}
                    </div>
                )}
            </div>
        </Link>
    );
}
