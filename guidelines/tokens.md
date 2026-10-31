# Tokens

## Source of truth
Токены генерирует движок Chroma42 (`src/engine/export/tailwind.ts` →
`tokens.css`). В UI доступны два пространства имён:

- `--c42-*` — канонические имена движка (истина);
- `--md-sys-color-*` — M3-адаптер для ui-кита ux42studio (см. `setup.md`).

## Цветовые роли
| Группа | Токены движка | Использование |
|---|---|---|
| Акцент | `primary`, `on-primary`, `primary-container`, `on-primary-container` | filled-кнопки, активные состояния, чипы |
| Вторичная | `secondary`, `on-secondary`, `secondary-container`, `on-secondary-container` | вторичные акценты |
| Третичная | `tertiary`, `on-tertiary`, `tertiary-container`, `on-tertiary-container` | третичные акценты |
| Ошибка | `error`, `on-error`, `error-container`, `on-error-container` | деструктив, валидация, критичные состояния |
| Поверхности | `surface`, `surface-container`, `surface-container-high` | слои: канва, карточки, шиты |
| Текст | `on-surface`, `on-surface-variant`, `on-surface-muted` | основной / вторичный / приглушённый |
| Границы | `outline`, `border-strong` | обычные / усиленные границы |
| Состояния | `disabled`, `placeholder`, `focus-ring` | отключено, плейсхолдер, фокус |
| Эффекты | `surface-glass` (alpha 0.7), `overlay`, `scrim` | стекло, шиты, затемнение; требуют подложку |

## Режимы (8)
Свет: `light-normal` (база), `light-medium` (запас ×1.25), `light-high`
(×1.55), `light-reduced-transparency` (непрозрачные фолбэки стекла).
Тьма — зеркально. Переключение только через `data-theme`.

## Типографика
- Шрифты: `Poppins` (`--font-display`) — заголовки, `Inter` (`--font-body`) —
  UI и текст.
- Роли: `text-display-*`, `text-headline-*`, `text-title-*`, `text-body-*`,
  `text-label-*`; по умолчанию `text-body-md`.
- line-height и tracking привязаны к размеру, не к весу.
- Стандартный UI-текст без кастомных размеров.

## Shape и elevation
- Кнопки и инпуты: `rounded-md` (10px).
- Карточки: `rounded-xl` (16) или `rounded-2xl` (20).
- Диалоги: `rounded-4xl` (24px+).
- Тени — только для иерархии: оверлеи, меню, диалоги, плавающие элементы.

## Чего нельзя
- Хардкодить HEX — даже «на секунду». Нет роли? Сначала токен в движке,
  потом UI.
- Дублировать значения токенов в локальном CSS.
- Вводить второй источник цветов (material-theme-JSON ux42studio — только как
  референс, не как источник для Chroma42).
