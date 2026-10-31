# Pattern: переключение режимов (8)

## Когда использовать
Любой переключатель темы в Chroma42: 4 уровня политики × свет/тьма — итого
8 режимов. Это не «light/dark», как в обычных приложениях.

## Правила
- Режим — полный: одно из 8 значений `data-theme`:
  `light-normal`, `light-medium`, `light-high`, `light-reduced-transparency`,
  `dark-normal`, `dark-medium`, `dark-high`, `dark-reduced-transparency`.
- `ThemeProvider` выставляет атрибут на `document.documentElement` и хранит
  режим в React-контексте; начальное значение — из `data-theme`, выставленного
  инлайн-скриптом (защита от FOUC).
- Стекло (`surface-glass`, `overlay`, `scrim`) в `*-reduced-transparency`
  автоматически непрозрачное — движок уже поставил alpha 1 в фолбэках; UI не
  добавляет свои CSS-хаки.
- Переключатель UI: группа из 4 опций контраста + тумблер свет/тьма —
  не один dropdown на 8 опций (≤2-3 опции → segmented, см. anti-patterns).
- Выбранный режим отражается в экспорте: пользователь видит и получает
  `tokens.css` именно для текущего режима (плюс все остальные в файле).

## Do
```tsx
<div role="radiogroup" aria-label="Контраст темы">
    <Button variant={mode.endsWith('normal') ? 'default' : 'outline'}>Обычный</Button>
    <Button variant={mode.endsWith('medium') ? 'default' : 'outline'}>Усиленный</Button>
    <Button variant={mode.endsWith('high') ? 'default' : 'outline'}>Высокий</Button>
</div>
<Switch checked={mode.startsWith('dark')} onCheckedChange={toggleScheme} />
```

## Don't
- Не маппить 8 режимов на булев light/dark.
- Не рендерить UI в режиме, для которого тема не собрана.
- Не применять прозрачность вручную — alpha задаёт движок.
