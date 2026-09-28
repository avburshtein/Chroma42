'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Plus, Trash2 } from 'lucide-react';
import { saveMainPageContent, updateProfile } from '@/lib/actions/profile';
import ImageUploaderField from '@/components/ImageUploaderField';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/Select';
import {
    generateThemeCss,
    isValidSeed,
    PRESET_SEEDS,
} from '@/lib/theme';
import type {
    ButtonVariant,
    MainPageContent,
    ProcessStep,
} from '@/lib/mainPageContent';

type Props = {
    profileId: string;
    initialContent: MainPageContent;
    /** Аватар/обложка профиля ( редактируются в разделе Hero) */
    avatarFileId: string;
    coverFileId: string;
    /** Активный раздел сайдбара — рендерим только его */
    visibleSection: string;
};

const textareaClass =
    'w-full rounded-md border border-outline-variant bg-surface px-3 py-2 text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary';

/** Редактор одного тег-массива (skills / tools / process steps). */
function TagList({
    label,
    tags,
    onChange,
}: {
    label: string;
    tags: string[];
    onChange: (tags: string[]) => void;
}) {
    const [draft, setDraft] = useState('');

    const add = () => {
        const v = draft.trim();
        if (!v || tags.includes(v)) return;
        onChange([...tags, v]);
        setDraft('');
    };

    return (
        <div>
            <Label>{label}</Label>
            <div className='mb-2 flex flex-wrap gap-2'>
                {tags.map((tag, i) => (
                    <span
                        key={`${tag}-${i}`}
                        className='inline-flex items-center gap-1 rounded-full bg-surface-variant px-3 py-1 text-body-sm text-on-surface'
                    >
                        {tag}
                        <button
                            type='button'
                            onClick={() => onChange(tags.filter((_, j) => j !== i))}
                            className='cursor-pointer text-on-surface-variant hover:text-error'
                            aria-label={`Remove ${tag}`}
                        >
                            <Trash2 className='h-3 w-3' />
                        </button>
                    </span>
                ))}
            </div>
            <div className='flex gap-2'>
                <Input
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            add();
                        }
                    }}
                    placeholder='Add tag…'
                />
                <Button type='button' variant='outline' size='sm' onClick={add}>
                    <Plus className='mr-1 h-4 w-4' /> Add
                </Button>
            </div>
        </div>
    );
}

const VARIANT_OPTIONS: { value: ButtonVariant; label: string }[] = [
    { value: 'primary', label: 'Primary (solid)' },
    { value: 'secondary', label: 'Secondary (outline)' },
    { value: 'ghost', label: 'Ghost (text only)' },
    { value: 'link', label: 'Link (underline)' },
];

/** Выбор варианта кнопки (семейства: primary/secondary/ghost/link). */
function VariantSelect({
    id,
    label,
    value,
    onChange,
}: {
    id: string;
    label: string;
    value: ButtonVariant;
    onChange: (v: ButtonVariant) => void;
}) {
    return (
        <div>
            <Label htmlFor={id}>{label}</Label>
            <Select
                value={value}
                onValueChange={(v) => onChange(v as ButtonVariant)}
            >
                <SelectTrigger id={id}>
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    {VARIANT_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
}

/** Редактор этапов работы (My process): заголовок + описание. */
function StepsEditor({
    label,
    steps,
    onChange,
}: {
    label: string;
    steps: ProcessStep[];
    onChange: (steps: ProcessStep[]) => void;
}) {
    const update = (i: number, patch: Partial<ProcessStep>) =>
        onChange(steps.map((s, j) => (j === i ? { ...s, ...patch } : s)));

    return (
        <div>
            <Label>{label}</Label>
            <div className='space-y-3'>
                {steps.map((step, i) => (
                    <div
                        key={i}
                        className='space-y-2 rounded-lg border border-outline-variant p-3'
                    >
                        <div className='flex items-center gap-2'>
                            <span className='shrink-0 text-body-sm text-on-surface-variant'>
                                {String(i + 1).padStart(2, '0')}
                            </span>
                            <Input
                                value={step.title}
                                onChange={(e) => update(i, { title: e.target.value })}
                                placeholder='Step title'
                                aria-label={`Step ${i + 1} title`}
                            />
                            <button
                                type='button'
                                onClick={() =>
                                    onChange(steps.filter((_, j) => j !== i))
                                }
                                className='flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-md text-on-surface-variant hover:bg-surface-variant hover:text-error'
                                aria-label={`Remove step ${i + 1}`}
                            >
                                <Trash2 className='h-4 w-4' />
                            </button>
                        </div>
                        <textarea
                            rows={2}
                            className={textareaClass}
                            value={step.description}
                            onChange={(e) =>
                                update(i, { description: e.target.value })
                            }
                            placeholder='Step description'
                            aria-label={`Step ${i + 1} description`}
                        />
                    </div>
                ))}
            </div>
            <Button
                type='button'
                variant='outline'
                size='sm'
                className='mt-2 w-full'
                onClick={() => onChange([...steps, { title: '', description: '' }])}
            >
                <Plus className='mr-1 h-4 w-4' /> Add step
            </Button>
        </div>
    );
}

function Section({
    title,
    visible,
    onVisibleChange,
    children,
}: {
    title: string;
    visible?: boolean;
    onVisibleChange?: (v: boolean) => void;
    children: React.ReactNode;
}) {
    return (
        <fieldset className='rounded-xl border border-outline-variant p-4'>
            <legend className='flex w-full items-center gap-3 px-2 text-left'>
                <span className='text-title-sm font-semibold text-on-surface'>
                    {title}
                </span>
                {onVisibleChange && (
                    <label className='flex cursor-pointer items-center gap-1.5 text-body-sm text-on-surface-variant'>
                        <input
                            type='checkbox'
                            checked={visible ?? true}
                            onChange={(e) => onVisibleChange(e.target.checked)}
                            className='h-4 w-4 cursor-pointer accent-[var(--md-sys-color-primary)]'
                        />
                        Show on page
                    </label>
                )}
            </legend>
            <div className='space-y-4'>{children}</div>
        </fieldset>
    );
}

export default function MainPageContentEditor({
    profileId,
    initialContent,
    avatarFileId: initialAvatar,
    coverFileId: initialCover,
    visibleSection,
}: Props) {
    const [content, setContent] = useState<MainPageContent>(initialContent);
    const [avatarFileId, setAvatarFileId] = useState(initialAvatar);
    const [coverFileId, setCoverFileId] = useState(initialCover);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    // Обёртка секции: показываем только активный раздел сайдбара
    const wrap = (id: string, node: React.ReactNode) => (
        <div className={visibleSection === id ? '' : 'hidden'}>{node}</div>
    );

    // Live-превью темы в админке: инжектим CSS пока открыт раздел 06
    useEffect(() => {
        if (visibleSection !== 'theme') return;
        const css = content.theme.useCustomTheme
            ? generateThemeCss(content.theme.seedColor)
            : '';
        let styleTag = document.getElementById('admin-theme-preview');
        if (!css) {
            styleTag?.remove();
            return;
        }
        if (!styleTag) {
            styleTag = document.createElement('style');
            styleTag.id = 'admin-theme-preview';
            document.head.appendChild(styleTag);
        }
        styleTag.textContent = css;
    }, [visibleSection, content.theme.useCustomTheme, content.theme.seedColor]);

    const set = <S extends keyof MainPageContent>(
        section: S,
        patch: Partial<MainPageContent[S]>,
    ) =>
        setContent((prev) => ({
            ...prev,
            [section]: { ...prev[section], ...patch },
        }));

    const onSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError(null);
        setSuccess(false);
        try {
            await saveMainPageContent(profileId, content);
            // Аватар/обложка (раздел Hero): null = явное удаление
            await updateProfile(profileId, {
                avatarFileId: avatarFileId || null,
                coverFileId: coverFileId || null,
            });
            setSuccess(true);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Save failed');
        } finally {
            setSaving(false);
        }
    };

    return (
        <form onSubmit={onSubmit} className='space-y-6'>
                {wrap('hero', (
                <Section
                    title='01 · Hero'
                    visible={content.hero.visible}
                    onVisibleChange={(v) => set('hero', { visible: v })}
                >
                    <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
                        <div>
                            <Label>Avatar</Label>
                            <ImageUploaderField
                                value={avatarFileId || null}
                                onChange={(fileId) => setAvatarFileId(fileId ?? '')}
                                aspectRatio={1}
                                cropRatio={1}
                            />
                        </div>
                        <div>
                            <Label>Cover</Label>
                            <ImageUploaderField
                                value={coverFileId || null}
                                onChange={(fileId) => setCoverFileId(fileId ?? '')}
                                aspectRatio={16 / 5}
                                cropRatio={16 / 5}
                            />
                        </div>
                    </div>
                    <label className='flex cursor-pointer items-center gap-2 text-body-sm text-on-surface-variant'>
                        <input
                            type='checkbox'
                            checked={content.hero.floatingElements}
                            onChange={(e) =>
                                set('hero', { floatingElements: e.target.checked })
                            }
                            className='h-4 w-4 cursor-pointer accent-[var(--md-sys-color-primary)]'
                        />
                        Floating elements (bokeh)
                    </label>
                    <div className='grid grid-cols-1 gap-4 md:grid-cols-3'>
                        <div>
                            <Label htmlFor='mp-h1'>Heading line 1 *</Label>
                            <Input
                                id='mp-h1'
                                value={content.hero.headingLine1}
                                onChange={(e) => set('hero', { headingLine1: e.target.value })}
                            />
                        </div>
                        <div>
                            <Label htmlFor='mp-ha'>Heading accent *</Label>
                            <Input
                                id='mp-ha'
                                value={content.hero.headingAccent}
                                onChange={(e) => set('hero', { headingAccent: e.target.value })}
                            />
                        </div>
                        <div>
                            <Label htmlFor='mp-h2'>Heading line 2</Label>
                            <Input
                                id='mp-h2'
                                value={content.hero.headingLine2}
                                onChange={(e) => set('hero', { headingLine2: e.target.value })}
                            />
                        </div>
                    </div>
                    <div>
                        <Label htmlFor='mp-hd'>Description *</Label>
                        <textarea
                            id='mp-hd'
                            rows={3}
                            className={textareaClass}
                            value={content.hero.description}
                            onChange={(e) => set('hero', { description: e.target.value })}
                        />
                    </div>
                    <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
                        <VariantSelect
                            id='mp-hpv'
                            label='CTA primary — button style'
                            value={content.hero.ctaPrimaryVariant}
                            onChange={(v) => set('hero', { ctaPrimaryVariant: v })}
                        />
                        <div />
                        <div>
                            <Label htmlFor='mp-hpl'>CTA primary — label</Label>
                            <Input
                                id='mp-hpl'
                                value={content.hero.ctaPrimaryLabel}
                                onChange={(e) => set('hero', { ctaPrimaryLabel: e.target.value })}
                            />
                        </div>
                        <div>
                            <Label htmlFor='mp-hpu'>CTA primary — link</Label>
                            <Input
                                id='mp-hpu'
                                value={content.hero.ctaPrimaryUrl}
                                onChange={(e) => set('hero', { ctaPrimaryUrl: e.target.value })}
                            />
                        </div>
                        <VariantSelect
                            id='mp-hsv'
                            label='CTA secondary — button style'
                            value={content.hero.ctaSecondaryVariant}
                            onChange={(v) => set('hero', { ctaSecondaryVariant: v })}
                        />
                        <div />
                        <div>
                            <Label htmlFor='mp-hsl'>CTA secondary — label</Label>
                            <Input
                                id='mp-hsl'
                                value={content.hero.ctaSecondaryLabel}
                                onChange={(e) => set('hero', { ctaSecondaryLabel: e.target.value })}
                            />
                        </div>
                        <div>
                            <Label htmlFor='mp-hsu'>CTA secondary — link</Label>
                            <Input
                                id='mp-hsu'
                                value={content.hero.ctaSecondaryUrl}
                                onChange={(e) => set('hero', { ctaSecondaryUrl: e.target.value })}
                            />
                        </div>
                    </div>
                </Section>
                ))}

                {wrap('portfolio', (
                <Section
                    title='02 · Portfolio Gallery'
                    visible={content.portfolio.visible}
                    onVisibleChange={(v) => set('portfolio', { visible: v })}
                >
                    <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
                        <div>
                            <Label htmlFor='mp-pt'>Section title *</Label>
                            <Input
                                id='mp-pt'
                                value={content.portfolio.title}
                                onChange={(e) => set('portfolio', { title: e.target.value })}
                            />
                        </div>
                        <div>
                            <Label htmlFor='mp-ps'>Section subtitle</Label>
                            <Input
                                id='mp-ps'
                                value={content.portfolio.subtitle}
                                onChange={(e) => set('portfolio', { subtitle: e.target.value })}
                            />
                        </div>
                        <div>
                            <Label htmlFor='mp-pcl'>CTA button — label</Label>
                            <Input
                                id='mp-pcl'
                                value={content.portfolio.ctaLabel}
                                onChange={(e) => set('portfolio', { ctaLabel: e.target.value })}
                            />
                        </div>
                        <div>
                            <Label htmlFor='mp-pcu'>CTA button — link</Label>
                            <Input
                                id='mp-pcu'
                                value={content.portfolio.ctaUrl}
                                onChange={(e) => set('portfolio', { ctaUrl: e.target.value })}
                            />
                        </div>
                        <VariantSelect
                            id='mp-pcv'
                            label='CTA button — style'
                            value={content.portfolio.ctaVariant}
                            onChange={(v) => set('portfolio', { ctaVariant: v })}
                        />
                    </div>
                </Section>
                ))}

                {wrap('about', (
                <Section
                    title='03 · About'
                    visible={content.about.visible}
                    onVisibleChange={(v) => set('about', { visible: v })}
                >
                    <div>
                        <Label htmlFor='mp-ah'>About heading *</Label>
                        <Input
                            id='mp-ah'
                            value={content.about.heading}
                            onChange={(e) => set('about', { heading: e.target.value })}
                        />
                    </div>
                    <div>
                        <Label htmlFor='mp-ap1'>Paragraph 1 *</Label>
                        <textarea
                            id='mp-ap1'
                            rows={3}
                            className={textareaClass}
                            value={content.about.paragraph1}
                            onChange={(e) => set('about', { paragraph1: e.target.value })}
                        />
                    </div>
                    <div>
                        <Label htmlFor='mp-ap2'>Paragraph 2</Label>
                        <textarea
                            id='mp-ap2'
                            rows={3}
                            className={textareaClass}
                            value={content.about.paragraph2}
                            onChange={(e) => set('about', { paragraph2: e.target.value })}
                        />
                    </div>
                    <div>
                        <Label htmlFor='mp-ap3'>Paragraph 3</Label>
                        <textarea
                            id='mp-ap3'
                            rows={3}
                            className={textareaClass}
                            value={content.about.paragraph3}
                            onChange={(e) => set('about', { paragraph3: e.target.value })}
                        />
                    </div>
                    <div>
                        <Label>Process image</Label>
                        <ImageUploaderField
                            value={content.about.processImageFileId}
                            onChange={(fileId) =>
                                set('about', { processImageFileId: fileId ?? null })
                            }
                            aspectRatio={516 / 495}
                            cropRatio={516 / 495}
                        />
                    </div>
                </Section>
                ))}

                {wrap('expertise', (
                <Section
                    title='04 · Expertise'
                    visible={content.expertise.visible}
                    onVisibleChange={(v) => set('expertise', { visible: v })}
                >
                    <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
                        <div>
                            <Label htmlFor='mp-esl'>Skills label</Label>
                            <Input
                                id='mp-esl'
                                value={content.expertise.skillsLabel}
                                onChange={(e) => set('expertise', { skillsLabel: e.target.value })}
                            />
                        </div>
                        <div>
                            <Label htmlFor='mp-etl'>Tools label</Label>
                            <Input
                                id='mp-etl'
                                value={content.expertise.toolsLabel}
                                onChange={(e) => set('expertise', { toolsLabel: e.target.value })}
                            />
                        </div>
                    </div>
                    <TagList
                        label='Skills tags'
                        tags={content.expertise.skills}
                        onChange={(skills) => set('expertise', { skills })}
                    />
                    <TagList
                        label='Tools tags'
                        tags={content.expertise.tools}
                        onChange={(tools) => set('expertise', { tools })}
                    />
                    <div>
                        <Label htmlFor='mp-epl'>Process label</Label>
                        <Input
                            id='mp-epl'
                            value={content.expertise.processLabel}
                            onChange={(e) => set('expertise', { processLabel: e.target.value })}
                        />
                    </div>
                    <StepsEditor
                        label='Process steps'
                        steps={content.expertise.processSteps}
                        onChange={(processSteps) => set('expertise', { processSteps })}
                    />
                    <label className='flex cursor-pointer items-center gap-2 text-body-sm text-on-surface-variant'>
                        <input
                            type='checkbox'
                            checked={content.expertise.proBonoVisible}
                            onChange={(e) =>
                                set('expertise', { proBonoVisible: e.target.checked })
                            }
                            className='h-4 w-4 cursor-pointer accent-[var(--md-sys-color-primary)]'
                        />
                        Pro Bono — show banner on page
                    </label>
                    <div>
                        <Label htmlFor='mp-epb'>Pro Bono text</Label>
                        <textarea
                            id='mp-epb'
                            rows={3}
                            className={textareaClass}
                            value={content.expertise.proBonoText}
                            onChange={(e) => set('expertise', { proBonoText: e.target.value })}
                        />
                    </div>
                    <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
                        <VariantSelect
                            id='mp-epbv'
                            label='Pro Bono CTA — button style'
                            value={content.expertise.proBonoCtaVariant}
                            onChange={(v) => set('expertise', { proBonoCtaVariant: v })}
                        />
                        <div />
                        <div>
                            <Label htmlFor='mp-epbl'>Pro Bono CTA — label</Label>
                            <Input
                                id='mp-epbl'
                                value={content.expertise.proBonoCtaLabel}
                                onChange={(e) => set('expertise', { proBonoCtaLabel: e.target.value })}
                            />
                        </div>
                        <div>
                            <Label htmlFor='mp-epbu'>Pro Bono CTA — link</Label>
                            <Input
                                id='mp-epbu'
                                value={content.expertise.proBonoCtaUrl}
                                onChange={(e) => set('expertise', { proBonoCtaUrl: e.target.value })}
                            />
                        </div>
                    </div>
                </Section>
                ))}

                {wrap('cta', (
                <Section
                    title='05 · CTA (Get in Touch)'
                    visible={content.cta.visible}
                    onVisibleChange={(v) => set('cta', { visible: v })}
                >
                    <div>
                        <Label htmlFor='mp-ch'>CTA heading *</Label>
                        <Input
                            id='mp-ch'
                            value={content.cta.heading}
                            onChange={(e) => set('cta', { heading: e.target.value })}
                        />
                    </div>
                    <label className='flex cursor-pointer items-center gap-2 text-body-sm text-on-surface-variant'>
                        <input
                            type='checkbox'
                            checked={content.cta.floatingElements}
                            onChange={(e) =>
                                set('cta', { floatingElements: e.target.checked })
                            }
                            className='h-4 w-4 cursor-pointer accent-[var(--md-sys-color-primary)]'
                        />
                        Floating elements (bokeh)
                    </label>
                    <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
                        <div>
                            <Label htmlFor='mp-cd1'>Description line 1</Label>
                            <Input
                                id='mp-cd1'
                                value={content.cta.description1}
                                onChange={(e) => set('cta', { description1: e.target.value })}
                            />
                        </div>
                        <div>
                            <Label htmlFor='mp-cd2'>Description line 2</Label>
                            <Input
                                id='mp-cd2'
                                value={content.cta.description2}
                                onChange={(e) => set('cta', { description2: e.target.value })}
                            />
                        </div>
                        <VariantSelect
                            id='mp-cev'
                            label='Email button — style'
                            value={content.cta.emailVariant}
                            onChange={(v) => set('cta', { emailVariant: v })}
                        />
                        <div />
                        <div>
                            <Label htmlFor='mp-cel'>Email button — label</Label>
                            <Input
                                id='mp-cel'
                                value={content.cta.emailLabel}
                                onChange={(e) => set('cta', { emailLabel: e.target.value })}
                            />
                        </div>
                        <div>
                            <Label htmlFor='mp-cea'>Email address</Label>
                            <Input
                                id='mp-cea'
                                type='email'
                                value={content.cta.emailAddress}
                                onChange={(e) => set('cta', { emailAddress: e.target.value })}
                            />
                        </div>
                        <VariantSelect
                            id='mp-cwv'
                            label='WhatsApp button — style'
                            value={content.cta.whatsappVariant}
                            onChange={(v) => set('cta', { whatsappVariant: v })}
                        />
                        <div />
                        <div>
                            <Label htmlFor='mp-cwl'>WhatsApp button — label</Label>
                            <Input
                                id='mp-cwl'
                                value={content.cta.whatsappLabel}
                                onChange={(e) => set('cta', { whatsappLabel: e.target.value })}
                            />
                        </div>
                        <div>
                            <Label htmlFor='mp-cwu'>WhatsApp link</Label>
                            <Input
                                id='mp-cwu'
                                value={content.cta.whatsappUrl}
                                onChange={(e) => set('cta', { whatsappUrl: e.target.value })}
                            />
                        </div>
                    </div>
                </Section>
                ))}

                {/* 06 · Color Theme: seed → M3-схема (light+dark), live-превью */}
                {wrap('theme', (
                <Section title='06 · Color Theme'>
                    <label className='flex cursor-pointer items-center gap-2 text-body-sm text-on-surface-variant'>
                        <input
                            type='checkbox'
                            checked={content.theme.useCustomTheme}
                            onChange={(e) =>
                                set('theme', { useCustomTheme: e.target.checked })
                            }
                            className='h-4 w-4 cursor-pointer accent-[var(--md-sys-color-primary)]'
                        />
                        Custom color theme (seed → M3 light &amp; dark)
                    </label>

                    <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
                        <div>
                            <Label htmlFor='mp-seed'>Seed color</Label>
                            <div className='flex items-center gap-2'>
                                <input
                                    id='mp-seed'
                                    type='color'
                                    value={
                                        isValidSeed(content.theme.seedColor)
                                            ? content.theme.seedColor
                                            : '#0b6e4f'
                                    }
                                    onChange={(e) =>
                                        set('theme', { seedColor: e.target.value })
                                    }
                                    className='h-10 w-14 cursor-pointer rounded-md border border-outline-variant bg-surface p-1'
                                    disabled={!content.theme.useCustomTheme}
                                />
                                <Input
                                    value={content.theme.seedColor}
                                    onChange={(e) =>
                                        set('theme', { seedColor: e.target.value })
                                    }
                                    placeholder='#0b6e4f'
                                    disabled={!content.theme.useCustomTheme}
                                />
                            </div>
                            {!isValidSeed(content.theme.seedColor) && (
                                <p className='mt-1 text-body-sm text-error'>
                                    Hex format: #RRGGBB
                                </p>
                            )}
                        </div>
                        <div>
                            <Label>Presets</Label>
                            <div className='flex flex-wrap gap-2'>
                                {PRESET_SEEDS.map((preset) => (
                                    <button
                                        key={preset.value}
                                        type='button'
                                        onClick={() =>
                                            set('theme', {
                                                seedColor: preset.value,
                                                useCustomTheme: true,
                                            })
                                        }
                                        title={preset.label}
                                        disabled={!content.theme.useCustomTheme}
                                        className='h-10 w-10 cursor-pointer rounded-full border-2 border-outline-variant transition-transform hover:scale-110 disabled:cursor-not-allowed disabled:opacity-50'
                                        style={{ background: preset.value }}
                                        aria-label={preset.label}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>

                    <p className='text-body-sm text-on-surface-variant'>
                        Светлая и тёмная схемы генерируются автоматически по
                        логике токенов Material 3 — контраст сохраняется.
                        Выключенный чекбокс = дефолтная зелёная тема.
                    </p>

                    <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
                        <div>
                            <Label htmlFor='mp-header-mode'>Header</Label>
                            <Select
                                value={content.theme.header.mode}
                                onValueChange={(v) =>
                                    set('theme', {
                                        header: {
                                            ...content.theme.header,
                                            mode: v as MainPageContent['theme']['header']['mode'],
                                        },
                                    })
                                }
                                disabled={!content.theme.useCustomTheme}
                            >
                                <SelectTrigger id='mp-header-mode'>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value='default'>
                                        Default (glass)
                                    </SelectItem>
                                    <SelectItem value='transparent'>
                                        Transparent
                                    </SelectItem>
                                    <SelectItem value='solid'>
                                        Solid color
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                            {content.theme.header.mode === 'solid' && (
                                <div className='mt-2 flex items-center gap-2'>
                                    <input
                                        type='color'
                                        aria-label='Header color'
                                        value={content.theme.header.color ?? '#0b6e4f'}
                                        onChange={(e) =>
                                            set('theme', {
                                                header: {
                                                    ...content.theme.header,
                                                    color: e.target.value,
                                                },
                                            })
                                        }
                                        className='h-10 w-14 cursor-pointer rounded-md border border-outline-variant bg-surface p-1'
                                    />
                                    <Input
                                        value={content.theme.header.color ?? ''}
                                        onChange={(e) =>
                                            set('theme', {
                                                header: {
                                                    ...content.theme.header,
                                                    color: e.target.value,
                                                },
                                            })
                                        }
                                        placeholder='#0b6e4f'
                                    />
                                    <Button
                                        type='button'
                                        variant='outline'
                                        size='sm'
                                        onClick={() =>
                                            set('theme', {
                                                header: {
                                                    ...content.theme.header,
                                                    color: null,
                                                },
                                            })
                                        }
                                    >
                                        Reset
                                    </Button>
                                </div>
                            )}
                            <p className='mt-1 text-body-sm text-on-surface-variant'>
                                Solid: текст шапки автоматически контрастный.
                            </p>
                        </div>
                        <div>
                            <Label htmlFor='mp-bg-mode'>Background</Label>
                            <Select
                                value={content.theme.background.mode}
                                onValueChange={(v) =>
                                    set('theme', {
                                        background: {
                                            ...content.theme.background,
                                            mode: v as MainPageContent['theme']['background']['mode'],
                                        },
                                    })
                                }
                                disabled={!content.theme.useCustomTheme}
                            >
                                <SelectTrigger id='mp-bg-mode'>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value='default'>
                                        Default (surface)
                                    </SelectItem>
                                    <SelectItem value='seed-tint'>
                                        Accent tint (seed)
                                    </SelectItem>
                                    <SelectItem value='solid'>
                                        Solid color
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                            {content.theme.background.mode === 'solid' && (
                                <div className='mt-2 flex items-center gap-2'>
                                    <input
                                        type='color'
                                        aria-label='Background color'
                                        value={content.theme.background.color ?? '#f7faf5'}
                                        onChange={(e) =>
                                            set('theme', {
                                                background: {
                                                    ...content.theme.background,
                                                    color: e.target.value,
                                                },
                                            })
                                        }
                                        className='h-10 w-14 cursor-pointer rounded-md border border-outline-variant bg-surface p-1'
                                    />
                                    <Input
                                        value={content.theme.background.color ?? ''}
                                        onChange={(e) =>
                                            set('theme', {
                                                background: {
                                                    ...content.theme.background,
                                                    color: e.target.value,
                                                },
                                            })
                                        }
                                        placeholder='#f7faf5'
                                    />
                                    <Button
                                        type='button'
                                        variant='outline'
                                        size='sm'
                                        onClick={() =>
                                            set('theme', {
                                                background: {
                                                    ...content.theme.background,
                                                    color: null,
                                                },
                                            })
                                        }
                                    >
                                        Reset
                                    </Button>
                                </div>
                            )}
                            <p className='mt-1 text-body-sm text-on-surface-variant'>
                                Контент остаётся на светлой поверхности —
                                читаемость сохраняется.
                            </p>
                        </div>
                    </div>

                    <div className='rounded-xl border border-outline-variant p-4'>
                        <h3 className='mb-3 text-title-sm font-semibold text-on-surface'>
                            Floating elements
                        </h3>
                        <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
                            <div>
                                <Label htmlFor='mp-float-color'>Color</Label>
                                <div className='flex items-center gap-2'>
                                    <input
                                        id='mp-float-color'
                                        type='color'
                                        value={content.floating.color ?? '#0b6e4f'}
                                        onChange={(e) =>
                                            set('floating', { color: e.target.value })
                                        }
                                        className='h-10 w-14 cursor-pointer rounded-md border border-outline-variant bg-surface p-1'
                                    />
                                    <Button
                                        type='button'
                                        variant='outline'
                                        size='sm'
                                        onClick={() => set('floating', { color: null })}
                                    >
                                        Reset
                                    </Button>
                                </div>
                                <p className='mt-1 text-body-sm text-on-surface-variant'>
                                    Пусто = дефолтная палитра.
                                </p>
                            </div>
                            <div>
                                <Label htmlFor='mp-float-shape'>Shape</Label>
                                <Select
                                    value={content.floating.shape}
                                    onValueChange={(v) =>
                                        set('floating', {
                                            shape: v as MainPageContent['floating']['shape'],
                                        })
                                    }
                                >
                                    <SelectTrigger id='mp-float-shape'>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value='default'>
                                            Default (mixed)
                                        </SelectItem>
                                        <SelectItem value='circle'>Circles</SelectItem>
                                        <SelectItem value='square'>Squares</SelectItem>
                                        <SelectItem value='triangle'>Triangles</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>
                </Section>
                ))}

                {error && <p className='text-body-sm text-error'>{error}</p>}
                {success && (
                    <p className='text-body-sm text-primary'>
                        Main page content saved successfully!
                    </p>
                )}

                <div className='flex justify-end gap-3 pt-2'>
                    <Button type='submit' disabled={saving}>
                        {saving ? 'Saving...' : 'Save Main Page Content'}
                    </Button>
                </div>
            </form>
    );
}

