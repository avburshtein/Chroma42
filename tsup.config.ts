import { defineConfig } from 'tsup';

/**
 * Сборка библиотечной части Chroma42.
 *
 * Приложение (Next.js) импортирует движки напрямую из `src/engine`, а
 * пакет собирается из `src/index.ts` — публичной точки входа без React
 * и без Next.js. Формат только ESM: движок написан на современном
 * TypeScript, потребителям (Next.js 15+, Node 20+) CommonJS не нужен.
 */
export default defineConfig({
    entry: { index: 'src/index.ts' },
    format: ['esm'],
    target: 'es2022',
    platform: 'neutral',
    dts: true,
    sourcemap: true,
    clean: true,
    treeshake: true,
    splitting: false,
});
