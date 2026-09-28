import React from 'react';
import { Button } from '@/components/ui/Button';

type ProjectFormProps = {
    title: string;
    description?: string;
    children: React.ReactNode;
    onSave: () => Promise<void>;
    isSaving?: boolean;
};

export default function ProjectForm({
    title,
    description,
    children,
    onSave,
    isSaving = false,
}: ProjectFormProps) {
    const handleSave = async () => {
        await onSave();
    };

    return (
        <section className='space-y-6' aria-labelledby='project-form-title'>
            <div className='space-y-1'>
                <h2
                    id='project-form-title'
                    className='text-headline-sm text-[var(--md-sys-color-on-surface)]'
                >
                    {title}
                </h2>
                {description && (
                    <p className='text-body-md text-[var(--md-sys-color-on-surface-variant)]'>
                        {description}
                    </p>
                )}
            </div>

            <div className='space-y-4'>{children}</div>

            <div className='flex items-center gap-3'>
                <Button
                    type='button'
                    onClick={handleSave}
                    disabled={isSaving}
                    aria-busy={isSaving}
                >
                    {isSaving ? (
                        <>
                            <svg
                                className='mr-2 h-4 w-4 animate-spin'
                                xmlns='http://www.w3.org/2000/svg'
                                fill='none'
                                viewBox='0 0 24 24'
                                aria-hidden='true'
                            >
                                <circle
                                    className='opacity-25'
                                    cx='12'
                                    cy='12'
                                    r='10'
                                    stroke='currentColor'
                                    strokeWidth='4'
                                />
                                <path
                                    className='opacity-75'
                                    fill='currentColor'
                                    d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z'
                                />
                            </svg>
                            Saving...
                        </>
                    ) : (
                        'Save'
                    )}
                </Button>
            </div>
        </section>
    );
}
