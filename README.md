# macOS For All для OpenIDEA

Раскладка клавиш «macOS For All», перенесённая из плагина для JetBrains IDE в [OpenIDEA](https://github.com/l0ng-ai/openidea).
Это раскладка macOS для Windows и Linux: шорткаты с ⌘ переназначены на клавиши без ⌘ (в основном на Ctrl).
Иначе в OpenIDEA на Windows ⌘ превращается в клавишу Win.

## Источники

| Что | Репозиторий | Версия, из которой собрано |
|---|---|---|
| Раскладка (оригинал для IntelliJ) | https://github.com/samvtran/jetbrains-macos-keybindings-for-all | плагин 3.0.0, коммит `0e87834` (2024-10-07) |
| OpenIDEA (ID действий, формат настроек) | https://github.com/l0ng-ai/openidea | 0.1.43, коммит `a3b48b7` (2026-11-12) |

Исходная раскладка лежит в файле `src/main/resources/keymaps/macOS For All.xml` первого репозитория.
Таблица изменённых шорткатов есть в его README, раздел «Key Updates».

## Что в репозитории

- `macos-for-all.keymap.toml` — готовая раскладка для OpenIDEA. Это блок, который вставляется в `settings.toml`.
- `macOS For All.xml` — оригинальный файл раскладки IntelliJ.
- `convert.mjs` — конвертер XML → OpenIDEA. Нужен, чтобы пересобрать раскладку после обновлений.
- `LICENSE`, `NOTICE.txt` — лицензия Apache 2.0 и NOTICE оригинального проекта.

## Установка

1. **Закрой OpenIDEA.** Иначе при сохранении настроек она перезапишет файл.
2. Открой `%APPDATA%\ai.l0ng.openidea\settings.toml` и сделай его резервную копию.
3. Замени строку `keymap = ...` в начале файла на:
   ```toml
   keymap = "custom.macos-for-all"
   ```
   Если такой строки нет, добавь её первой строкой файла.
4. Допиши в конец `settings.toml` всё содержимое `macos-for-all.keymap.toml`.
   Если в файле уже есть блок `[customKeymaps."custom.macos-for-all"...]`, сначала удали его.
5. Запусти OpenIDEA и проверь, что в Settings › Keymap выбрана «macOS For All».

Откат: выбери другую раскладку в Settings › Keymap или верни резервную копию `settings.toml`.

Шорткаты можно менять прямо в Settings › Keymap. OpenIDEA сохранит их в этот же блок раскладки.
Учти: при пересборке и повторной вставке блока ручные правки пропадут.

## Обновление

Пересобирай раскладку, когда выйдет новая версия плагина macOS For All или OpenIDEA.
Например, если в OpenIDEA появились новые действия.

Нужны `git` и Node.js (18+). Команды выполняются в корне этого репозитория.
Склонированные исходники и папка `out` уже добавлены в `.gitignore`.

```bash
git clone --depth 1 https://github.com/samvtran/jetbrains-macos-keybindings-for-all
```

```bash
git clone --depth 1 https://github.com/l0ng-ai/openidea
```

```bash
node convert.mjs openidea "jetbrains-macos-keybindings-for-all/src/main/resources/keymaps/macOS For All.xml" out
```

Результат появится в папке `out`:

- `out/macos-for-all.toml` — новая версия `macos-for-all.keymap.toml`. Её ставят по шагам из раздела «Установка».
- `out/macos-for-all.json` — то же самое в JSON.

Скрипт также печатает отчёт:

- `mappedIdeaActions` / `overrides` — сколько действий IntelliJ перенесено и сколько переопределений получилось в OpenIDEA;
- `unmapped` — действия IntelliJ, для которых в таблице нет соответствия в OpenIDEA;
- `skipped` — шорткаты, которые не удалось разобрать;
- `conflicts` — клавиши, которые раскладка назначает, а у родительской раскладки Windows они заняты другими действиями.
  Большинство конфликтов такие же, как у оригинала в IntelliJ, либо контекстные (базы данных, HTTP-клиент, попапы).

Если скрипт падает с `Unknown OpenIDEA ids: ...`, значит, OpenIDEA переименовала действие.
Найди новый ID в `openidea/src/platform/keymaps/intellij-windows.ts` и исправь таблицу `extra` в `convert.mjs`.

### Как устроено соответствие действий

- Сначала берётся встроенная таблица OpenIDEA `src/platform/ideaActions.ts`: ID действий IntelliJ → ID действий OpenIDEA.
  Её же использует встроенный импорт «Import IntelliJ IDEA Keymap…».
- К ней добавляется расширенная таблица `extra` из `convert.mjs`.
- Родительская раскладка — `intellij-windows`. Так же устроен оригинал: в IntelliJ он строится поверх `$default`, то есть раскладки Windows.
- Если действие встречается в XML несколько раз, его шорткаты объединяются.

Почему не встроенный импорт XML в OpenIDEA (Settings › Keymap › ⚙ › Import IntelliJ IDEA Keymap…):
он знает меньше действий и переносит только 46 из 194. Конвертер переносит 121 действие (126 переопределений).

## Ограничения

- **Движение каретки и удаление по словам не переносятся.** Это `EditorLineStart`/`End`, `EditorPreviousWord`/`NextWord`, `EditorDeleteToWordStart`/`End` и т.п.
  В OpenIDEA их обрабатывает сам редактор, переназначить их нельзя. Работает поведение Windows: `Home`/`End`, `Ctrl+←/→`.
- **Часть действий в OpenIDEA отсутствует.** Например, `GotoRelated`, `EmojiAndSymbols`, `MethodOverloadSwitch*`, `MinimizeCurrentWindow`.
  Полный список выводится в `unmapped`.
- **Это не плагин OpenIDEA.** Её плагины могут назначать клавиши только своим командам, переопределить шорткаты IDE они не могут. Поэтому раскладка ставится через `settings.toml`.

## Лицензия

Apache License 2.0, см. `LICENSE` и `NOTICE.txt`.
Раскладка основана на [macOS For All](https://github.com/samvtran/jetbrains-macos-keybindings-for-all) от samvtran, Apache 2.0.
В `macos-for-all.keymap.toml` она перенесена в формат OpenIDEA: ID действий IntelliJ заменены на ID действий OpenIDEA.
