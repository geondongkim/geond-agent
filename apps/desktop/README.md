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
- schema v5 materialized tables for context attachments, tool calls, command
  output previews, diff summaries, usage metadata, and Claude run attempt
  summaries derived from normalized events,
- Tauri query commands and a typed renderer client for reading those
  materialized inspector records without replaying the full event stream,
- workspace discovery for the active local checkout,
- opt-in Claude Code `stream-json` process execution.
- command-menu actions for starting the selected runner, choosing workspaces,
  attaching metadata-only workspace context, opening inspector tabs, and
  toggling workbench panels.
- composer context chips for reviewing attached workspace/file references before
  dispatching a run.
- non-secret interaction preferences such as runner mode, follow-up policy,
  composer Enter behavior, and review delivery.

The Claude Code process runner may read a local `.env.local` file from the
selected workspace and pass only the allowed Claude/Z.ai routing variables to
the child process. It maps `ZAI_API_KEY` to process-local
`ANTHROPIC_API_KEY` when needed, but the key value is never returned to the
renderer, written to the SQLite event store, or committed to the repository.

Each Claude run attempt is tracked as redacted metadata: runner mode, backend
selection, model alias/profile, command preview, prompt summary, external
session id when present, event counts, parse warnings, exit code, and final
status. The renderer keeps a browser `localStorage` and in-memory event-store
fallback for Vite-only development. It must not persist provider secrets, raw
Claude logs, account state, private local tool session files, or raw private
file contents from context attachments.

## Verification

- `pnpm --filter @geond-agent/desktop test:e2e` runs the full renderer
  workbench e2e suite.
- `pnpm --filter @geond-agent/desktop test:e2e:layout` runs the focused compact
  and wide layout guard. It captures `workbench-compact-layout.png` and
  `workbench-wide-layout.png` under Playwright `test-results` so CI can retain
  visual evidence without committing screenshots.
- The e2e suite is split by workbench surface: layout, context evidence,
  settings persistence, and runner/approval review. Keep new tests in the
  closest surface file instead of growing a single large spec again.

`createDesktopMaterializedEventStore` is the renderer boundary for the v5
materialized event views. It reads context attachments, tool calls, command
output previews, diff summaries, usage metadata, and run attempt summaries
through Tauri commands when the native shell is available, and falls back to an
in-memory read model during renderer-only development. The active inspector
refreshes those materialized records for the selected session and falls back to
replay-derived projection data when native SQLite commands are unavailable.
