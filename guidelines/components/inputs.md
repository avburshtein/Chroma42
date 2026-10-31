# Inputs (TextField)

## Purpose
Ввод однострочного и многострочного текста, выбор из списка.

## When to use
- `Input` — однострочное поле (сид цвета, имя темы).
- `Textarea` — многострочный текст (описание темы).
- `Select` — выбор из 3+ опций (политика, режим). При 2 и меньше — radio или
  segmented control.
- Всегда внутри `Field`: подпись + контрол + зарезервированное место под
  hint/error.

## Tokens
| Часть | Токен |
|---|---|
| Граница | `outline` |
| Фон | `surface` |
| Текст | `on-surface` |
| Placeholder | `on-surface-variant` |
| Focus | `outline-2` цветом `primary`, `outline-offset-[-2px]`, `border-transparent` |
| Error | `error` / `on-error` |

## Rules
- Зарезервированное место под helper/error (`min-h-[1.5rem]`) — появление
  ошибки не сдвигает форму (no-CLS).
- Label связывается через `htmlFor` = `id` контрола.
- Ошибка показывается вместо подсказки (приоритет).
- Ввод HEX-сидов: валидация на месте, но парсинг/конвертация — только движок
  (`parseColor`), UI не изобретает свою.
- `error` — только для деструктива, валидации и критичных состояний
  (`secondary` — акцент, не ошибка).

## Do
```tsx
<Field id="seed-primary" label="Seed Primary" error={errors.primary}>
    <Input id="seed-primary" type="text" />
</Field>
```

## Don't
- Убирать зарезервированное место под подсказку.
- Кастомный input вне Field.
- Ring-фокус на полях (устарело — канон: outline-2).

## Code mapping
`src/components/ui/{Input,Textarea,Select,Field}.tsx`.
