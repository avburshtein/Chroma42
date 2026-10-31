# Buttons

## Purpose
Кнопки запускают действие пользователя или навигацию.

## When to use
- `default` (filled) — единственное главное действие экрана или секции.
- `secondary` (tonal) или `outline` — вторичные действия.
- `ghost` — минимальный вес: тулбары, карточки.
- `link` — low-emphasis действия внутри текста и диалогов.
- `destructive` — необратимые или высокорисковые действия (удаление темы,
  сброс сидов).

## Variants
| Variant | Токены | Использование |
|---|---|---|
| `default` | `primary` / `on-primary` | главное действие |
| `secondary` | `secondary-container` / `on-secondary-container` | тональное вторичное |
| `outline` | граница `outline`, текст `on-surface`, hover `surface-container` | альтернативное |
| `ghost` | `on-surface`, hover `surface-container` | минимальный вес |
| `link` | `primary` | inline-действие |
| `destructive` | `error` / `on-error` | деструктивное |

## Sizes
`default` — h-10, `sm` — h-9, `lg` — h-11, `icon` — 10×10. Радиус `rounded-md`.

## States
default, hover (opacity-90), focus-visible (`ring-2` + `primary` +
`ring-offset-2`), active, disabled (opacity-50 + pointer-events-none).

## Rules
- Один filled-баттон на экран или секцию.
- Verb-first подписи: «Собрать тему», «Скопировать CSS», «Скачать отчёт».
- На время pending — disabled; кнопку не прятать.
- Focus — `ring-2` с `--md-sys-color-primary`.

## Do
```tsx
<Button variant="default">Собрать тему</Button>
<Button variant="outline">Сравнить режимы</Button>
<Button variant="destructive">Удалить тему</Button>
```

## Don't
- Два filled рядом с равным визуальным весом.
- Кастомные кнопки вместо кита.
- Кнопка, меняющая цветовой тон темы в рантайме без пересборки темы
  движком (сид меняется → тема пересобирается → UI перерисовывается).

## Code mapping
- Компонент: `src/components/ui/Button.tsx`
- Импорт: `@/components/ui/Button`
