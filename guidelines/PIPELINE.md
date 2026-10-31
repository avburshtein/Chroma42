# Pipeline — Chroma42 UI

Рабочий процесс дизайн-системы Chroma42 (основа — ux42studio).

## Общая схема

```
Figma (Variables / Components, макеты)
        ↓ (сид темы)
движок Chroma42 (шкалы → раскладка → аудит)
        ↓ (экспорт)
tokens.css + tailwind.css (--c42-*, 8 режимов)
        ↓ (маппинг)
globals.css (--md-sys-color-* → --c42-*)
        ↓ (реализация)
src/components/ui/* (Radix + CVA + cn, база ux42studio)
        ↓ (документация)
guidelines/ (overview, setup, tokens, components, patterns)
        ↓
Figma Make kit / ИИ-агенты → генерация экранов
```

## Этап 1: Токен
1. Проверить, есть ли роль в движке (`policy/registry.ts`, `theme-builder.ts`).
2. Нет — добавить токен и пропустить через аудит: обязательные пары должны
   пройти выбранную политику, иначе экспорт заблокируется.
3. Обновить `guidelines/tokens.md`.
4. `npm run typecheck && npm test` + визуальная проверка во всех 8 режимах.

## Этап 2: Компонент
1. Проверить существующие (см. `component-audit.md`) — дубли запрещены.
2. Component contract: Purpose, Variants, States, Tokens, Accessibility,
   Do/Don't.
3. Реализация: Radix + CVA + `cn()`, только токены, без инлайн-стилей.
4. Документация: `guidelines/components/<name>.md`.
5. WCAG 2.2 AA, focus-visible, клавиатура, mobile/desktop, все 8 режимов.

## Этап 3: Паттерн
1. `guidelines/patterns/<name>.md`: когда использовать, правила, примеры.
2. Связать с компонентами из `components/`.

## Проверка перед коммитом
```
□ Только токены из движка, ноль хардкода
□ 8 режимов проверены визуально
□ Состояния: default / hover / focus-visible / active / disabled
□ npm run typecheck && npm test — зелёные
□ Документация обновлена
```

## Отчёт после задачи
`## Result` / `## Files changed` / `## Decisions` / `## Open questions`.
