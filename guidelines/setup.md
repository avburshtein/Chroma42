# Setup

## Источник токенов
- Единственный источник цветов — экспорт движка Chroma42:
  `tokens.css` — переменные `--c42-*` по 8 режимам (переключение `data-theme`);
  `tailwind.css` — статический `@theme inline`, связывающий утилиты Tailwind
  (`bg-surface`, `text-on-surface`) с переменными.
- Оба файла подключаются один раз в корневом layout и никогда не дублируются
  в локальном CSS.
- Оба файла генерирует `exportTailwindTheme(theme)` — ручной «доработанный»
  CSS с теми же значениями запрещён (`anti-patterns.md`).

## Маппинг M3 → Chroma42
Компоненты ui-кита ux42studio используют роли `--md-sys-color-*`. В Chroma42
роли связываются с токенами движка через адаптер в `globals.css`:

```css
:root, [data-theme="light-normal"] {
  --md-sys-color-primary: var(--c42-primary);
  --md-sys-color-on-primary: var(--c42-on-primary);
  --md-sys-color-primary-container: var(--c42-primary-container);
  /* ... зеркально для secondary/tertiary/error/surface/outline */
}
```

Компоненты кита при этом не меняются — меняется только маппинг. Роли без
прямого аналога в M3 (`on-surface-muted`, `border-strong`, `placeholder`,
`disabled`, `focus-ring`, `surface-glass`) используются напрямую:
`var(--c42-on-surface-muted)` и т.д.

## Режимы (8)
`data-theme` принимает одно из значений:

| Режим | Смысл |
|---|---|
| `light-normal` / `dark-normal` | базовая политика |
| `light-medium` / `dark-medium` | запас контраста ×1.25 |
| `light-high` / `dark-high` | запас контраста ×1.55 |
| `light-reduced-transparency` / `dark-reduced-transparency` | непрозрачные фолбэки стекла |

`ThemeProvider` хранит полный режим (не только light/dark) и выставляет
`document.documentElement.setAttribute('data-theme', mode)`. Подробнее —
`patterns/mode-switching.md`.

## Правила кода
- `cn()` из `@/lib/utils` (clsx + tailwind-merge), варианты — `cva`.
- Radix-примитивы для сложного поведения: Dialog, Select, Tabs, DropdownMenu,
  Switch, Checkbox, Toast.
- Новые компоненты — только в `src/components/ui/`.
- Не добавлять вторую UI-библиотеку или дизайн-систему.
- Не переопределять внутренности M3/UX42-компонентов произвольным CSS.
