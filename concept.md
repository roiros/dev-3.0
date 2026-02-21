# Product Concept

Terminal-centric project manager — iTerm2 meets Kanban. A desktop app for managing multiple AI coding agents (Claude Code, Gemini CLI, etc.) and other terminal-based tools across many tasks and projects from a single interface.

**Target platforms:** cross-platform (macOS, Linux, Windows).

## Status tracker

Legend: `[x]` done, `[-]` in progress, `[ ]` not started

### Infrastructure

- [x] Electrobun app shell (main process, window, menu)
- [x] Vite + React renderer with HMR
- [x] ghostty-web terminal integration (single instance)
- [x] Native PTY via Bun.spawn (WebSocket bridge)
- [ ] JSON-based data storage layer (projects, tasks, settings)

### Navigation

- [ ] Dashboard screen (list of all projects)
- [ ] "Add project" flow (pick a folder, validate it's a git repo)
- [ ] Project view (Kanban board)
- [ ] Task view (full-screen terminal + "Back to Kanban" button)
- [ ] Routing between dashboard / project / task views

### Project model

- [ ] Project config: setup script, default tmux command, default base branch
- [ ] Project settings screen (UI for editing config)
- [ ] Persist project list and settings to JSON on disk

### Kanban board

- [ ] Render columns: To Do, In Progress, User Questions, Review by AI, Review by User, Completed, Cancelled
- [ ] Create / rename / delete task cards
- [ ] Drag-and-drop between columns
- [ ] Custom columns (v2 — planned, not started)

### Git worktree management

- [ ] Create worktree when task moves to an active status
- [ ] Base branch from project settings (default: main), with per-task override
- [ ] Run project-level setup script inside new worktree
- [ ] Remove worktree when task moves to Completed or Cancelled

### Terminal lifecycle

- [ ] Spawn terminal (ghostty-web + PTY) in the task's worktree
- [ ] Start tmux with configurable predefined command (e.g., `claude`)
- [ ] Respawn terminal if process dies while task is active
- [ ] Tear down terminal on Completed / Cancelled
- [ ] No terminal for tasks in To Do — create on first activation

---

## Detailed design notes

### App navigation

| Screen | What the user sees |
|---|---|
| Dashboard | List of all added projects |
| Project view | Kanban board for one project |
| Task view | Full-screen terminal, "Back to Kanban" button to return |

### Project model

- A project = a folder on the user's disk (must be a git repo, one repo per project).
- Data storage: **JSON files on disk** (no database).
- Each project has a **settings screen** where the user configures: setup script, default tmux command, default base branch, etc.
- **Setup script** is one per project (no per-task overrides for now).

### Kanban columns (v1)

| # | Column | Meaning |
|---|---|---|
| 1 | To Do | Not started, no terminal/worktree |
| 2 | In Progress | Active work, terminal running |
| 3 | User Questions | Task blocked, waiting for human input |
| 4 | Review by AI | AI is reviewing the work |
| 5 | Review by User | Human is reviewing the work |
| 6 | Completed | Done — terminal & worktree torn down |
| 7 | Cancelled | Abandoned — terminal & worktree torn down |

Custom columns are planned for later versions.

### Task lifecycle

1. User creates a new card on the Kanban board (starts in **To Do**).
2. When the task moves to an active status, the app creates a **git worktree** from the project's repo. Base branch is configured in project settings (default: main), can be overridden per task.
3. The project-level **setup script** runs inside the new worktree (e.g., install deps, copy configs).
4. A terminal opens **inside that worktree**, already running **tmux** with a predefined command (e.g., `claude` to launch Claude Code automatically).
5. The user works in that isolated worktree. They can spawn more tmux panes/windows as needed.

Every task gets its own isolated git branch + working directory, and the terminal drops you straight into the action with the right tool already running.

### Terminal lifecycle

- A terminal (+ worktree) exists for every task in an **active status** (anything except To Do, Completed, or Cancelled).
- If the terminal process dies while the task is active, the app respawns it.
- Moving a task to **Completed** or **Cancelled** tears down the terminal and removes the worktree.
- Tasks in **To Do** do not have a terminal or worktree yet — they are created when the task moves to an active status.

### Terminal engine

The terminal emulator is **ghostty-web** (already integrated into the project). PTY is provided by Bun.spawn's native terminal API, bridged to the renderer via WebSocket.
