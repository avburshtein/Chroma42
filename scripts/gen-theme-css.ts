/**
 * Генерирует статические CSS-артефакты приложения из движка.
 *
 * Запускается вручную (`npm run gen:theme`) при изменении реестра пар
 * или дефолтных сидов: имена токенов детерминированы, поэтому маппинг
 * `@theme inline` и дефолтные значения `--c42-*` коммитятся в репозиторий
 * и обеспечивают SSR-первый кадр без FOUC. Живые значения (изменённые
 * сиды) подставляет клиент через `<style id="c42-runtime">`.
 *
 * @see app/globals.css — куда импортируются артефакты
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

import {
    buildThemeBundle,
    DEFAULT_POLICY,
    defaultSeeds,
} from '../src/lib/theme-pipeline';
import { generateTailwindPreset, generateTokensCss } from '../src/engine/export/tailwind';

const root = resolve(import.meta.dirname, '..');

const { theme } = buildThemeBundle('Chroma42 default', defaultSeeds(), DEFAULT_POLICY);

const mappingPath = resolve(root, 'app/theme-mapping.css');
mkdirSync(dirname(mappingPath), { recursive: true });
writeFileSync(mappingPath, generateTailwindPreset(theme));

const tokensPath = resolve(root, 'app/theme-default.css');
writeFileSync(tokensPath, generateTokensCss(theme));

console.log('Готово: app/theme-mapping.css, app/theme-default.css');
