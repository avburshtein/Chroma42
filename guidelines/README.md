# Chroma42 Design System — Guidelines for Figma Make & AI Agents

Компактные тематические правила для Figma Make и ИИ-агентов (Claude, Cursor,
Cline). Структура повторяет дизайн-систему UX42 (проект `ux42studio`):
**короткий вход (`overview.md`) + узкие доменные документы**, не один
громоздкий markdown.

## Структура

```
guidelines/
├── README.md              # этот файл
├── overview.md            # принципы продукта и порядок чтения
├── setup.md               # токены движка, провайдеры, маппинг M3→c42
├── tokens.md              # цветовые роли, режимы, типографика, shape
├── component-audit.md     # аудит кита: Chroma42 (375b3a5) ↔ ux42studio
├── components/
│   ├── buttons.md         # Button: варианты, состояния, do/don't
│   ├── inputs.md          # Input/Textarea/Select/Field: состояния, no-CLS
│   ├── cards.md           # Card: варианты, spacing, elevation
│   └── dialogs.md         # Dialog: focus trap, закрытие, a11y
├── patterns/
│   ├── mode-switching.md  # переключение 8 режимов темы
│   └── audit-panel.md     # панель аудита (Этап 9)
└── anti-patterns.md       # запреты: хардкод, дубли, приукрашивание аудита
```

## Как использовать

### Для Figma Make kit
1. Добавьте папку `guidelines/` в Make kit.
2. `overview.md` — главный вход, ссылается на остальные файлы.
3. Токены для Figma берите из экспорта движка (`tokens.css`, 8 режимов) —
   не из статического набора ux42studio.

### Для ИИ-агентов (Claude / Cursor / Cline)
1. Прочтите `overview.md` и `setup.md`.
2. Используйте `components/` и `patterns/` как уточняющие правила по UI.
3. Новый компонент — только через `PIPELINE.md`; перед созданием проверьте
   `component-audit.md`, чтобы не задублировать кит ux42studio.

## Связанные документы

- `Docs/Chroma42 Color Pair Methodology.md` — методология контраста
- `Docs/Общая архитектура Chroma42.md` — движки и модель темы
- `Docs/roadmap/Роадмап с учётом всех запланированных фич.md` — план
- `D:\Хранилище\Projects\ux42studio\guidelines\` — оригинал UX42 Design System
