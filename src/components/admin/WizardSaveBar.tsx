'use client';

import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';

/**
 * Флаг «Saved ✓» для шагов визарда кейса: markSaved() включает индикатор,
 * через 2.5 с он скрывается сам. Пока идёт сохранение, индикатор не показан.
 */
export function useSavedFlag(): [boolean, () => void] {
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        if (!saved) return;
        const timer = setTimeout(() => setSaved(false), 2500);
        return () => clearTimeout(timer);
    }, [saved]);

    return [saved, () => setSaved(true)];
}

type WizardSaveBarProps = {
    saving: boolean;
    saved: boolean;
    /**
     * Сохранить без перехода — валидация формы + onSaveOnly.
     * В страницах передаётся handleSubmit(onSaveOnly).
     */
    onSave: (e?: React.BaseSyntheticEvent) => void;
    /** Подпись основной кнопки (submit формы: сохранение + переход). */
    nextLabel?: string;
    /** Скрыть основную кнопку — шаг без следующего раздела (Review). */
    nextHidden?: boolean;
    /** Вариант кнопки Save (Review держит её primary). */
    saveVariant?: 'outline' | 'default';
};

/**
 * Кнопки сохранения в футере шага визарда кейса: «Save» — сохранить и
 * остаться на разделе (чтобы сразу открыть превью), «Save & Next →» —
 * сохранить и перейти к следующему разделу (submit формы). Рендерится
 * внутри flex-контейнера футера рядом с «← Back».
 */
export default function WizardSaveBar({
    saving,
    saved,
    onSave,
    nextLabel = 'Save & Next →',
    nextHidden = false,
    saveVariant = 'outline',
}: WizardSaveBarProps) {
    return (
        <div className='flex items-center gap-3'>
            {saved && !saving && (
                <span
                    className='mr-auto text-body-sm text-primary'
                    role='status'
                >
                    Saved ✓
                </span>
            )}
            <Button
                type='button'
                variant={saveVariant}
                onClick={onSave}
                disabled={saving}
            >
                {saving ? 'Saving...' : 'Save'}
            </Button>
            {!nextHidden && (
                <Button type='submit' disabled={saving}>
                    {saving ? 'Saving...' : nextLabel}
                </Button>
            )}
        </div>
    );
}
