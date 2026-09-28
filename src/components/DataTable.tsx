'use client';

import React, { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import {
    ChevronUp,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    Search,
} from 'lucide-react';

type Column<T> = {
    key: string;
    header: string;
    sortable?: boolean;
    render?: (item: T) => React.ReactNode;
};

type DataTableProps<T> = {
    data: T[];
    columns: Column<T>[];
    searchable?: boolean;
    searchPlaceholder?: string;
    pageSize?: number;
};

type SortDirection = 'asc' | 'desc' | null;

export default function DataTable<T extends Record<string, unknown>>({
    data,
    columns,
    searchable = false,
    searchPlaceholder = 'Search...',
    pageSize = 10,
}: DataTableProps<T>) {
    const [search, setSearch] = useState('');
    const [sortKey, setSortKey] = useState<string | null>(null);
    const [sortDir, setSortDir] = useState<SortDirection>(null);
    const [page, setPage] = useState(0);

    const filtered = useMemo(() => {
        if (!search.trim()) return data;
        const lower = search.toLowerCase();
        return data.filter((item) =>
            columns.some((col) => {
                const val = item[col.key];
                return (
                    typeof val === 'string' && val.toLowerCase().includes(lower)
                );
            }),
        );
    }, [data, search, columns]);

    const sorted = useMemo(() => {
        if (!sortKey || !sortDir) return filtered;
        return [...filtered].sort((a, b) => {
            const aVal = a[sortKey];
            const bVal = b[sortKey];

            if (aVal == null && bVal == null) return 0;
            if (aVal == null) return 1;
            if (bVal == null) return -1;

            let cmp = 0;
            if (typeof aVal === 'string' && typeof bVal === 'string') {
                cmp = aVal.localeCompare(bVal);
            } else if (typeof aVal === 'number' && typeof bVal === 'number') {
                cmp = aVal - bVal;
            } else {
                cmp = String(aVal).localeCompare(String(bVal));
            }

            return sortDir === 'asc' ? cmp : -cmp;
        });
    }, [filtered, sortKey, sortDir]);

    const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
    const safePage = Math.min(page, totalPages - 1);
    const paginated = sorted.slice(
        safePage * pageSize,
        (safePage + 1) * pageSize,
    );

    const handleSort = (key: string) => {
        if (sortKey === key) {
            if (sortDir === 'asc') {
                setSortDir('desc');
            } else if (sortDir === 'desc') {
                setSortKey(null);
                setSortDir(null);
            }
        } else {
            setSortKey(key);
            setSortDir('asc');
        }
        setPage(0);
    };

    const getSortIcon = (key: string) => {
        if (sortKey !== key) return null;
        return sortDir === 'asc' ? (
            <ChevronUp className='h-4 w-4' />
        ) : (
            <ChevronDown className='h-4 w-4' />
        );
    };

    if (data.length === 0) {
        return (
            <div className='flex flex-col items-center justify-center py-12 text-[var(--md-sys-color-on-surface-variant)]'>
                <p className='text-body-md'>No data</p>
            </div>
        );
    }

    return (
        <div className='space-y-4'>
            {searchable && (
                <div className='relative'>
                    <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--md-sys-color-on-surface-variant)]' />
                    <Input
                        value={search}
                        onChange={(e) => {
                            setSearch(e.target.value);
                            setPage(0);
                        }}
                        placeholder={searchPlaceholder}
                        className='pl-9'
                        aria-label={searchPlaceholder}
                    />
                </div>
            )}

            <div className='overflow-x-auto rounded-lg border border-[var(--md-sys-color-outline-variant)]'>
                <table className='w-full text-body-sm' role='table'>
                    <thead>
                        <tr className='border-b border-[var(--md-sys-color-outline-variant)] bg-[var(--md-sys-color-surface-variant)]'>
                            {columns.map((col) => (
                                <th
                                    key={col.key}
                                    className={cn(
                                        'px-4 py-3 text-left text-label-sm text-[var(--md-sys-color-on-surface-variant)] font-medium',
                                        col.sortable &&
                                            'cursor-pointer select-none hover:text-[var(--md-sys-color-on-surface)] transition-colors',
                                    )}
                                    onClick={() =>
                                        col.sortable && handleSort(col.key)
                                    }
                                    aria-sort={
                                        sortKey === col.key
                                            ? sortDir === 'asc'
                                                ? 'ascending'
                                                : 'descending'
                                            : undefined
                                    }
                                    scope='col'
                                >
                                    <span className='inline-flex items-center gap-1'>
                                        {col.header}
                                        {col.sortable && getSortIcon(col.key)}
                                    </span>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {paginated.length === 0 ? (
                            <tr>
                                <td
                                    colSpan={columns.length}
                                    className='px-4 py-8 text-center text-[var(--md-sys-color-on-surface-variant)]'
                                >
                                    No results found.
                                </td>
                            </tr>
                        ) : (
                            paginated.map((item, rowIndex) => (
                                <tr
                                    key={rowIndex}
                                    className='border-b border-[var(--md-sys-color-outline-variant)] last:border-b-0 hover:bg-[var(--md-sys-color-surface-variant)]/50 transition-colors'
                                >
                                    {columns.map((col) => (
                                        <td
                                            key={col.key}
                                            className='px-4 py-3 text-[var(--md-sys-color-on-surface)]'
                                        >
                                            {col.render
                                                ? col.render(item)
                                                : String(item[col.key] ?? '')}
                                        </td>
                                    ))}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {totalPages > 1 && (
                <div className='flex items-center justify-between'>
                    <p className='text-label-sm text-[var(--md-sys-color-on-surface-variant)]'>
                        Page {safePage + 1} of {totalPages} ({sorted.length}{' '}
                        items)
                    </p>
                    <div className='flex items-center gap-1'>
                        <Button
                            variant='outline'
                            size='icon'
                            onClick={() => setPage((p) => Math.max(0, p - 1))}
                            disabled={safePage === 0}
                            aria-label='Previous page'
                        >
                            <ChevronLeft className='h-4 w-4' />
                        </Button>
                        <Button
                            variant='outline'
                            size='icon'
                            onClick={() =>
                                setPage((p) => Math.min(totalPages - 1, p + 1))
                            }
                            disabled={safePage >= totalPages - 1}
                            aria-label='Next page'
                        >
                            <ChevronRight className='h-4 w-4' />
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
