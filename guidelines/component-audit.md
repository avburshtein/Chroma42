# Аудит UI-кита: Chroma42 (375b3a5) ↔ ux42studio

Дата: 2026-10-31 · Метод: сравнение нормализованных (CRLF→LF) версий
`src/components/ui/*` из коммита `375b3a5` Chroma42 с текущим
`ux42studio/src/components/ui/*` (md5 + построчный diff).

## Результаты

**16 идентичны (byte-identical после нормализации):**
Avatar, Badge, Button, Card, Checkbox, Dialog, DropdownMenu, FormBox, Label,
PageTitle, PasswordInput, Skeleton, Switch, Tabs, Title, Toast.

**3 эволюционировали (канон — текущий ux42studio):**
- `Input`, `Textarea`: фокус переведён с `ring-2 ring-offset-2` на
  `outline-2 outline-offset-[-2px]` + `border-transparent` — убирает двойную
  рамку вокруг поля.
- `Select`: та же правка фокуса в `SelectTrigger`.

**1 новый:** `Field` — подпись + контрол + зарезервированное место под
hint/error (`min-h-[1.5rem]`, no-CLS). В старом Chroma42 отсутствовал.

## Выводы
1. Старый кит Chroma42 — сниппет ux42studio на момент 28.09.2026.
   Архитектурных расхождений нет, дублей внутри набора не обнаружено.
2. Канон для Chroma42 — текущее состояние ux42studio: 20 компонентов
   (добавляется `Field`), остальные 16 без изменений.
3. ux42studio в рантайме поддерживает только 2 режима (light/dark) и не
   подключает 6 вариантов контраста из `material-theme/`. Chroma42 идёт
   дальше: 8 режимов через `data-theme`; движок уже генерирует `tokens.css`
   для всех восьми.
4. Гэпы, которые закрывает Chroma42 (не существуют в ux42studio):
   Swatch/превью цветов, AuditTable, CopyChip («Скопировать CSS») —
   Chroma42-специфичные компоненты для Этапов 9–10.

## Решение
Канон берётся из ux42studio как есть. Chroma42 добавляет:
- маппинг M3→c42 в `globals.css` (см. `setup.md`);
- 8-режимный ThemeProvider (см. `patterns/mode-switching.md`);
- специфичные компоненты: Swatch, AuditTable, CopyChip (Этапы 9–10).
