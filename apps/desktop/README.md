# Desktop App

Native desktop app layer for `geond-agent`.

## Responsibility

- Own native app shell and window layout.
- Render the agent workbench surface.
- Connect UI state to bridge/provider packages through narrow interfaces.
- Keep provider secrets out of UI code.

## Planned Surfaces

- Session sidebar
- Chat timeline
- Plan panel
- Tool-call cards
- Terminal output
- Diff review
- Approval prompts

This app may learn from Goose Desktop UX patterns, but third-party source code
must not be copied without preserving its license and notices.

## Current Boundary

`apps/desktop` currently exposes `createDesktopWorkbench`, a framework-neutral
bootstrap helper that composes:

- `packages/ui-workbench` language settings and i18n runtime,
- `packages/zai-provider` endpoint/model routing helpers,
- `packages/claude-code-bridge` external CLI/ACP boundary.

The desktop shell is Tauri v2 with a React + Vite renderer. Native commands own:

- app-data JSON settings for non-secret preferences,
- SQLite storage for normalized workbench events,
- a durable SQLite session index for startup/session-rail metadata,
- workspace discovery for the active local checkout,
- opt-in Claude Code `stream-json` process execution.
- command-menu actions for starting the selected runner, choosing workspaces,
  opening inspector tabs, and toggling workbench panels.
- non-secret interaction preferences such as runner mode, follow-up policy,
  composer Enter behavior, and review delivery.

The Claude Code process runner may read a local `.env.local` file from the
selected workspace and pass only the allowed Claude/Z.ai routing variables to
the child process. It maps `ZAI_API_KEY` to process-local
`ANTHROPIC_API_KEY` when needed, but the key value is never returned to the
renderer, written to the SQLite event store, or committed to the repository.

The renderer keeps a browser `localStorage` and in-memory event-store fallback
for Vite-only development. It must not persist provider secrets, raw Claude
logs, account state, or private local tool session files.
