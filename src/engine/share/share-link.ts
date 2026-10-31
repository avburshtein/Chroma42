/**
 * Движок 11: шаринг темы по URL.
 *
 * В ссылку кладутся **только сиды**, а не готовая тема: получатель
 * пересчитывает шкалы своим движком. Это сжимает ссылку в разы и
 * гарантирует одинаковый результат на любой версии движка.
 *
 * Формат: `{ version, engine, policy, seeds }` → JSON → lz-string
 * (`compressToEncodedURIComponent`) → фрагмент `#s=...`.
 *
 * Повреждённые и устаревшие ссылки отклоняются с понятным сообщением:
 * версия и движок проверяются, неизвестная политика и битые сиды
 * отклоняются.
 *
 * @see Docs/roadmap — Этап 11
 */

import {
    compressToEncodedURIComponent,
    decompressFromEncodedURIComponent,
} from 'lz-string';
import { parseColor, formatHex } from '../color/parse';
import { POLICY_IDS, type PolicyId } from '../policy/policy';
import { ENGINE_VERSION } from '../audit/audit';
import type { Seeds } from '../../model/theme';

/** Версия формата ссылки. Меняется при несовместимых изменениях схемы. */
export const SHARE_LINK_VERSION = 2;

/** Коды ошибок разбора ссылки. */
export type ShareLinkErrorCode =
    | 'malformed-hash'
    | 'malformed-payload'
    | 'unsupported-version'
    | 'unsupported-engine'
    | 'unknown-policy'
    | 'invalid-seed';

/** Сообщения об ошибках для UI. */
const ERROR_MESSAGES: Record<ShareLinkErrorCode, string> = {
    'malformed-hash':
        'В ссылке нет данных темы (фрагмент #s=... отсутствует или пуст).',
    'malformed-payload':
        'Ссылка повреждена: данные не читаются (ожидается lz-string + JSON).',
    'unsupported-version':
        'Ссылка создана другой версией формата и не поддерживается.',
    'unsupported-engine':
        'Ссылка создана другой версией движка и не поддерживается.',
    'unknown-policy': 'В ссылке неизвестная политика доступности.',
    'invalid-seed': 'В ссылке некорректный сид-цвет (ожидается HEX).',
};

/** Ошибка разбора ссылки на тему. */
export class ShareLinkError extends Error {
    /** Машиночитаемый код для UI. */
    readonly code: ShareLinkErrorCode;

    constructor(code: ShareLinkErrorCode, detail?: string) {
        super(detail ? `${ERROR_MESSAGES[code]} (${detail})` : ERROR_MESSAGES[code]);
        this.name = 'ShareLinkError';
        this.code = code;
    }
}
/** Нормализует сид в HEX (uppercase) или возвращает `null`. */
function normalizeSeed(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    const parsed = parseColor(value);
    if (!parsed) return null;
    return formatHex({ ...parsed, alpha: 1 }).toUpperCase();
}

/** Проверяет payload и возвращает нормализованную копию. */
function validatePayload(raw: unknown): SharePayload {
    if (typeof raw !== 'object' || raw === null) {
        throw new ShareLinkError('malformed-payload', 'payload — не объект');
    }
    const obj = raw as Record<string, unknown>;

    if (obj.version !== SHARE_LINK_VERSION) {
        throw new ShareLinkError(
            'unsupported-version',
            `в ссылке version=${String(obj.version)}`,
        );
    }
    if (obj.engine !== ENGINE_VERSION) {
        throw new ShareLinkError(
            'unsupported-engine',
            `в ссылке engine=${String(obj.engine)}`,
        );
    }
    if (
        typeof obj.policy !== 'string' ||
        !POLICY_IDS.includes(obj.policy as PolicyId)
    ) {
        throw new ShareLinkError(
            'unknown-policy',
            `в ссылке policy=${String(obj.policy)}`,
        );
    }

    const seedsRaw = obj.seeds as Record<string, unknown>;
    if (typeof seedsRaw !== 'object' || seedsRaw === null) {
        throw new ShareLinkError('malformed-payload', 'seeds — не объект');
    }

    const draft: Record<string, string> = {};
    for (const key of Object.keys(seedsRaw) as (keyof Seeds)[]) {
        const normalized = normalizeSeed(seedsRaw[key]);
        if (!normalized) {
            throw new ShareLinkError('invalid-seed', `ключ ${key}`);
        }
        draft[key] = normalized;
    }
    const seeds = draft as Seeds;

    return {
        version: SHARE_LINK_VERSION,
        engine: ENGINE_VERSION,
        policy: obj.policy as PolicyId,
        seeds,
    };
}


/** Payload ссылки на тему. */
export type SharePayload = {
    /** Версия формата: `SHARE_LINK_VERSION`. */
    readonly version: number;
    /** Версия движка: `ENGINE_VERSION`. */
    readonly engine: string;
    /** Политика доступности. */
    readonly policy: PolicyId;
    /** Сид-цвета — единственное, что кладётся в ссылку. */
    readonly seeds: Seeds;
};


/**
 * Кодирует payload в строку для фрагмента URL.
 * @throws если сиды не валидны.
 */
export function encodeSharePayload(
    payload: { policy: PolicyId; seeds: Seeds },
): string {
    // Валидация: пробегаем через decode-путь, чтобы ошибки совпадали.
    const normalized = validatePayload({
        version: SHARE_LINK_VERSION,
        engine: ENGINE_VERSION,
        policy: payload.policy,
        seeds: payload.seeds,
    });
    const json = JSON.stringify(normalized);
    const compressed = compressToEncodedURIComponent(json);
    if (!compressed) {
        throw new ShareLinkError('malformed-payload', 'сжатие не удалось');
    }
    return compressed;
}

/**
 * Декодирует payload из строки фрагмента.
 * @throws `ShareLinkError` с машиночитаемым кодом.
 */
export function decodeSharePayload(encoded: string): SharePayload {
    if (!encoded) {
        throw new ShareLinkError('malformed-hash', 'фрагмент пуст');
    }
    const json = decompressFromEncodedURIComponent(encoded);
    if (!json) {
        throw new ShareLinkError('malformed-payload');
    }
    let raw: unknown;
    try {
        raw = JSON.parse(json);
    } catch {
        throw new ShareLinkError('malformed-payload', 'JSON не распознан');
    }
    return validatePayload(raw);
}

/** Извлекает фрагмент `#s=...` из URL или хеша. */
function extractFragment(input: string): string | null {
    const hashIndex = input.indexOf('#s=');
    if (hashIndex === -1) return null;
    const fragment = input.slice(hashIndex + 3);
    return fragment.split(/[?&]/)[0] || null;
}

/**
 * Собирает полную ссылку на тему.
 * @param base базовый URL (например, `https://chroma42.app/`).
 * @param payload политика + сиды.
 */
export function buildShareLink(
    base: string,
    payload: { policy: PolicyId; seeds: Seeds },
): string {
    const encoded = encodeSharePayload(payload);
    return `${base}${base.endsWith('/') ? '' : '/'}#s=${encoded}`;
}

/**
 * Разбирает ссылку (полный URL или один фрагмент).
 * @throws `ShareLinkError` с машиночитаемым кодом.
 */
export function parseShareLink(input: string): SharePayload {
    const fragment = extractFragment(input);
    if (!fragment) {
        throw new ShareLinkError('malformed-hash');
    }
    return decodeSharePayload(fragment);
}
