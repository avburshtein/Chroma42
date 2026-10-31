/**
 * Тесты движка 11: шаринг темы по URL.
 *
 * Проверяется roundtrip (encode → decode → те же сиды), размеры ссылок
 * и все коды ошибок: повреждённый payload, чужая версия формата,
 * чужая версия движка, неизвестная политика, битые сиды, отсутствие
 * фрагмента.
 *
 * @see Docs/roadmap — Этап 11
 */

import { describe, expect, it } from 'vitest';
import { compressToEncodedURIComponent } from 'lz-string';
import {
    SHARE_LINK_VERSION,
    ShareLinkError,
    buildShareLink,
    decodeSharePayload,
    encodeSharePayload,
    parseShareLink,
} from '../src/engine/share/share-link';
import { ENGINE_VERSION } from '../src/engine/audit/audit';
import type { Seeds } from '../src/model/theme';

/** Валидные сиды для тестов. */
const SEEDS: Seeds = {
    primary: '#6750A4',
    secondary: '#625B71',
    tertiary: '#7D5260',
    neutral: '#808080',
    success: '#2E7D32',
    warning: '#F9A825',
    error: '#B3261E',
    info: '#1565C0',
};

const POLICY = 'gov-aa' as const;

describe('encodeSharePayload / decodeSharePayload — roundtrip', () => {
    it('кодирует и декодирует payload без потерь', () => {
        const encoded = encodeSharePayload({ policy: POLICY, seeds: SEEDS });
        const decoded = decodeSharePayload(encoded);

        expect(decoded.version).toBe(SHARE_LINK_VERSION);
        expect(decoded.engine).toBe(ENGINE_VERSION);
        expect(decoded.policy).toBe(POLICY);
        expect(decoded.seeds).toEqual(SEEDS);
    });

    it('ссылка компактная (< 500 символов)', () => {
        const link = buildShareLink('https://chroma42.app/', {
            policy: POLICY,
            seeds: SEEDS,
        });
        expect(link.length).toBeLessThan(500);
    });

    it('buildShareLink → parseShareLink roundtrip', () => {
        const link = buildShareLink('https://chroma42.app/', {
            policy: POLICY,
            seeds: SEEDS,
        });
        expect(link).toContain('#s=');
        const parsed = parseShareLink(link);
        expect(parsed.seeds).toEqual(SEEDS);
        expect(parsed.policy).toBe(POLICY);
    });

    it('нормализует сиды: #6750a4 → #6750A4', () => {
        const encoded = encodeSharePayload({
            policy: POLICY,
            seeds: { ...SEEDS, primary: '#6750a4' },
        });
        const decoded = decodeSharePayload(encoded);
        expect(decoded.seeds.primary).toBe('#6750A4');
    });
});

describe('обработка ошибок', () => {
    it('malformed-hash: нет фрагмента', () => {
        try {
            parseShareLink('https://chroma42.app/');
            expect.fail('должна была быть выброшена ошибка');
        } catch (e) {
            expect(e).toBeInstanceOf(ShareLinkError);
            const err = e as ShareLinkError;
            expect(err.code).toBe('malformed-hash');
        }
    });

    it('malformed-payload: битая строка', () => {
        expect(() => decodeSharePayload('!!!not-lz-string!!!')).toThrow(
            ShareLinkError,
        );
        try {
            decodeSharePayload('!!!not-lz-string!!!');
        } catch (e) {
            expect((e as ShareLinkError).code).toBe('malformed-payload');
        }
    });

    it('unsupported-version: чужая версия формата', () => {
        // Меняем "version": 2 на "version": 99 в JSON-строке через lz-string
        // нельзя — поэтому подменяем через прямой JSON.parse на другом уровне.
        // Проще: используем decode на битом payload.
        const badJson = JSON.stringify({
            version: 99,
            engine: ENGINE_VERSION,
            policy: POLICY,
            seeds: SEEDS,
        });
        // lz-string кодирование чужого payload руками — имитируем старую ссылку
        const encoded = compressToEncodedURIComponent(badJson);
        try {
            decodeSharePayload(encoded);
            expect.fail('должна была быть выброшена ошибка');
        } catch (e) {
            expect((e as ShareLinkError).code).toBe('unsupported-version');
        }
    });

    it('unknown-policy: неизвестная политика', () => {
        const badJson = JSON.stringify({
            version: SHARE_LINK_VERSION,
            engine: ENGINE_VERSION,
            policy: 'nonexistent-policy',
            seeds: SEEDS,
        });
        const encoded = compressToEncodedURIComponent(badJson);
        expect(() => decodeSharePayload(encoded)).toThrow(ShareLinkError);
    });

    it('invalid-seed: некорректный HEX', () => {
        const badJson = JSON.stringify({
            version: SHARE_LINK_VERSION,
            engine: ENGINE_VERSION,
            policy: POLICY,
            seeds: { ...SEEDS, primary: 'not-a-color' },
        });
        const encoded = compressToEncodedURIComponent(badJson);
        try {
            decodeSharePayload(encoded);
            expect.fail('должна была быть выброшена ошибка');
        } catch (e) {
            expect((e as ShareLinkError).code).toBe('invalid-seed');
            expect((e as ShareLinkError).message).toContain('primary');
        }
    });

    it('unsupported-engine: чужая версия движка', () => {
        const badJson = JSON.stringify({
            version: SHARE_LINK_VERSION,
            engine: 'chroma42-oklch-solver-0.0.1',
            policy: POLICY,
            seeds: SEEDS,
        });
        const encoded = compressToEncodedURIComponent(badJson);
        try {
            decodeSharePayload(encoded);
            expect.fail('должна была быть выброшена ошибка');
        } catch (e) {
            expect((e as ShareLinkError).code).toBe('unsupported-engine');
        }
    });
});
