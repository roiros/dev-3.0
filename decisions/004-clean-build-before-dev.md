# 004 — Clean build before dev/build

## Context

After adding a new RPC handler (`runDevServer`) to `src/bun/rpc-handlers.ts`, running `bun run dev` resulted in "The requested method has no handler: runDevServer" at runtime. The frontend (Vite bundle) was fresh, but the backend (Bun bundle inside the app) was stale.

## Investigation

- `bun run dev` runs `vite build && electrobun dev`
- `vite build` rebuilds only the **frontend** (`src/mainview/` → `dist/`)
- `electrobun dev` bundles the **backend** (`src/bun/` → `build/.../app/bun/index.js`) BUT skips rebundling if the output file already exists
- Result: frontend sees the new RPC method, backend doesn't — runtime error

The stale bundle at `build/dev-macos-arm64/dev-3.0-dev.app/Contents/Resources/app/bun/index.js` had timestamp 13:13, while the source was changed at 13:24.

## Decision

Added a `clean` script to `package.json` that removes both `dist/` and the `Resources/app/` directory inside the app bundle. All build commands (`dev`, `build`, `build:prod`) now run `clean` first.

This is a blunt approach — it always forces a full rebuild of both frontend and backend. The cost is a few extra seconds per restart, but it eliminates an entire class of "stale bundle" bugs.

## Risks

- Clean path is hardcoded to `build/dev-macos-arm64/dev-3.0-dev.app/...` — only covers macOS ARM64 dev channel. If other targets are used, the clean script needs updating.
- Slightly slower dev iteration due to always rebuilding. Acceptable since the build is under 1s.

## Alternatives considered

- **Deleting only `app/bun/`** — would fix the backend issue specifically, but `dist/` can also get stale (e.g. leftover assets from renamed chunks). Cleaning both is more robust.
- **Relying on `electrobun dev` to detect changes** — not possible without modifying Electrobun itself.
