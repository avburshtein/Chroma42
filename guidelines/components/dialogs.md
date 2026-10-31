# Dialogs

## Purpose
Диалоги фокусируют внимание на одной задаче или решении.

## When to use
- Критичные подтверждения (удалить тему, сбросить сиды).
- Формы, требующие немедленного внимания.
- Просмотр паспорта/отчёта темы отдельным экраном.

## Tokens
- Overlay: `scrim` (`--c42-scrim`) — движок считает затемнение сам.
- Фон контента: `surface`.
- Граница: `outline` / `outline`-вариант.
- Радиус: `rounded-4xl` для модалок.
- Заголовок: `on-surface`; описание: `on-surface-variant`.

## States
- Default (open), focus-trap, closing, closed.
- Кнопка закрытия (X) с accessible-меткой, `Escape` закрывает.

## Rules
- Radix UI `Dialog` — фокус-менеджмент и a11y обязательны.
- Всегда `DialogTitle` + `DialogDescription`.
- Футер: primary справа, secondary слева.
- Диалоги не вкладываются.
- Тултипы/уведомления — не диалог (Toast).

## Do
```tsx
<Dialog>
    <DialogTrigger asChild>
        <Button variant="destructive">Удалить тему</Button>
    </DialogTrigger>
    <DialogContent>
        <DialogTitle>Удалить тему?</DialogTitle>
        <DialogDescription>Действие необратимо.</DialogDescription>
        <DialogFooter>
            <Button variant="outline">Отмена</Button>
            <Button variant="destructive">Удалить</Button>
        </DialogFooter>
    </DialogContent>
</Dialog>
```

## Code mapping
`src/components/ui/Dialog.tsx`.
