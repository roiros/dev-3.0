# 003 — Setup script через /tmp файлы (без env vars)

## Context

Нужно показывать setup-скрипт пользователю в отдельной tmux-панельке, пока агент
запускается в нижней. Два режима: foreground (агент ждёт завершения setup) и background
(оба параллельно).

## Investigation

**Попытка 1: env vars.** Идея — передать setup-скрипт и claude-команду через env vars
(`DEV3_SETUP_SCRIPT`, `DEV3_CLAUDE_CMD`), установленные в `Bun.spawn` при создании tmux-сессии.
Startup-скрипт ссылался на `$DEV3_SETUP_SCRIPT` и `$DEV3_CLAUDE_CMD`.

**Проблема:** tmux-сервер НЕ наследует env vars от клиентского процесса. Env vars из
`Bun.spawn` попадают в процесс tmux-клиента, но сервер (который реально запускает panes)
использует session environment, инициализируемый из `update-environment` опции. По умолчанию
туда входят только `DISPLAY`, `SSH_*`, `KRB5CCNAME`, `WINDOWID`, `XAUTHORITY`. Кастомные
`DEV3_*` переменные не попадают → startup-скрипт видит пустые строки → setup не работает,
claude не запускается (`[dead]` pane).

Подтверждено: `tmux show-environment -t dev3-xxx` не содержит `DEV3_*` переменных.

**Попытка 2: отдельные файлы.** Вместо env vars — пишем контент напрямую в файлы.

## Decision

Три файла в `/tmp/`:
- `dev3-{taskId}-setup.sh` — сырой текст setup-скрипта (как ввёл пользователь)
- `dev3-{taskId}-cmd.sh` — `exec {tmuxCmd}` (claude-команда)
- `dev3-{taskId}-startup.sh` — оркестрация (вызывает setup + split-window + cmd)

Startup-скрипт ссылается на файлы по абсолютным путям — никаких env vars, никакого escaping.

**Foreground** (`setupScriptBackground = false`):
1. pane 0: запускает setup (`bash -x "/tmp/dev3-{id}-setup.sh"`)
2. pane 0: после завершения делает `tmux split-window` → pane 1 с `bash /tmp/dev3-{id}-cmd.sh`
3. pane 0: `exec bash` — остаётся живым

**Background** (`setupScriptBackground = true`):
1. pane 0: сразу делает `tmux split-window` → pane 1 с `bash /tmp/dev3-{id}-cmd.sh`
2. pane 0: запускает setup параллельно
3. pane 0: `exec bash` — остаётся живым

Файлы в `/tmp` не удаляются — ОС уберёт при перезагрузке, это приемлемо.

Логика живёт в `src/bun/rpc-handlers.ts` → `launchTaskPty` (параметр `runSetup`).
На reconnect (`getPtyUrl`) `runSetup = false` — setup не перезапускается.

## Risks

- Если `/tmp` недоступен для записи — скрипт не создастся и задача не запустится.
  На macOS/Linux это практически невозможно.
- `tmux split-window` внутри startup-скрипта предполагает, что скрипт уже выполняется
  внутри tmux-сессии (что гарантируется `spawnPty`).
- Env vars из `extraEnv` (напр. `DEV3_TASK_TITLE`) тоже не доступны в tmux panes —
  это pre-existing issue, не связанный с данным изменением. Для критичных данных
  нужно использовать tmux `-e` флаг или `tmux set-environment`.

## Alternatives considered

- **Env vars через `Bun.spawn`** — не работает из-за tmux server/client архитектуры.
- **Inline escaping в tmuxCmd** — слишком хрупко для произвольного user input в setup-скрипте.
- **tmux `-e` флаг** — работает в tmux 3.2+, но менее наглядно и всё равно требует escaping.
- **Запуск setup до PTY** (старый подход в `git.ts`) — работал в фоне без видимости пользователю.
- **Named pipe / socket для синхронизации** — избыточно сложно для данной задачи.
