# ADR 0003: Desktop Workbench Stack

## Status

Accepted

## Context

The next implementation target is to reach the first usable workbench UI slice:

1. Claude Code route stabilization.
2. Local runner and session engine.
3. Desktop app shell.
4. Workbench UI.

The project needs concrete choices before implementation starts so early slices
do not drift across desktop frameworks, UI libraries, state models, persistence
backends, and backend routes.

State ownership and persistence are selected after reviewing
`geond-agent-protocol` references for Codex, Claude Code, GitHub Copilot Chat,
local-first storage, redaction, and dashboard read models.

## Decision

Use these defaults for the first implementation path:

| Area | Decision |
| --- | --- |
| Desktop shell | Tauri v2 |
| Renderer/UI stack | React + Vite + TypeScript |
| Styling/components | Tailwind CSS + shadcn/ui |
| Primary backend route | Claude Code first |
| Claude Code mode | `--bare -p --verbose --output-format stream-json` first |
| Later Claude features | ACP/session-resume complexity after live screen integration is stable |
| Model routing | Manual by default |
| Default model alias | `sonnet` for normal work |
| Hard-task model alias | `opus` for feature/architecture slices |
| State ownership | Hybrid local-first event model |
| Persistence | SQLite for local sessions/events/snapshots; Tauri app data JSON for small non-secret preferences |
| Approval policy | Ask-first |
| Layout | 3-pane workbench |
| i18n | Typed English/Korean UI messages; UI language stays separate from agent response language |
| Testing | Vitest for reducers/parsers/helpers first; Playwright after a shell-rendered app exists |
| OpenCode/Cline | Keep as comparison routes; defer implementation until the Claude Code path stabilizes |

## State Ownership

Use a hybrid local-first event model:

- `geond-agent` owns a local normalized `WorkbenchEvent` stream.
- UI state is derived by replay reducers/projections.
- React components render derived state only.
- Claude Code `stream-json` is normalized at the adapter boundary before the UI
  sees it.
- `geond-agent-protocol` is a later optional evidence/export target, not the
  live UI state owner.

This keeps the first workbench fast and deterministic while preserving a path
to cross-agent memory later.

## Persistence

Use local-first persistence:

- Tauri app data JSON stores small non-secret preferences:
  - UI language,
  - agent response language,
  - default backend,
  - default provider route,
  - default model alias,
  - layout preference.
- SQLite stores local durable workbench data:
  - sessions,
  - workbench events,
  - session snapshots,
  - approvals,
  - tool calls,
  - command outputs,
  - diff summaries,
  - usage metadata when available.
- Never persist API key values, tokens, provider account state, raw Claude Code
  logs by default, raw private transcripts, or local user session files in
  tracked source or portable exports.

`geond-agent-protocol` can be added later through explicit import/export or MCP
integration for shared evidence, reservations, handoffs, and review context.

## Layout Contract

The first workbench UI should use a 3-pane operational layout:

- Left: sessions, pinned sessions, backend status, workspace switcher.
- Center: event timeline with assistant text, plan updates, and tool activity.
- Right: inspector tabs for diff, terminal, approvals, settings, and selection
  metadata.

This is a workbench, not a chat-only UI. The user should always be able to see
what changed, what command ran, what approval is pending, and which backend,
provider route, model alias, and language settings apply to the current session.

## Consequences

Tauri v2 gives the project a native/local app direction while keeping the
renderer web stack productive. The cost is that process execution, filesystem
access, and local OS integration must go through explicit Tauri commands and
capabilities instead of a Node main process.

React + Vite + TypeScript keeps the UI package aligned with the existing pnpm
workspace. Tailwind + shadcn/ui should speed up dense workbench controls, but
the app must still keep domain-specific surfaces such as timeline, diff,
terminal, approval, and model/backend picker components under local ownership.

Claude Code remains the paved implementation route. OpenCode and Cline remain
important comparison paths, but the first UI should not split implementation
effort across multiple runners.

The local event + SQLite choice keeps `geond-agent` usable without PostgreSQL or
MCP setup. It also leaves room to map selected sessions into
`geond-agent-protocol` later without coupling the live UI to protocol storage.
