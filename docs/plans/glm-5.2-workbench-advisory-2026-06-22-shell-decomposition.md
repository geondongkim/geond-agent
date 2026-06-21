# GLM 5.2 Workbench Advisory - Shell Decomposition

This note records the Claude Code `opus` advisory requested before the next
implementation push. Claude Code was routed through the local Z.ai
Anthropic-compatible environment. The raw stream-json output stayed local under
`/tmp/geond-agent-glm52-next-advisory/` and is not committed.

## Prompt Scope

The advisory was asked to review the current project direction and next work
against the existing docs and implementation boundaries:

- architecture, roadmap, desktop stack ADR, and protocol integration strategy,
- Codex-level UX quality bar,
- backend/model selection roadmap,
- Claude Code route decision,
- UI workbench, Claude bridge, and Z.ai provider package READMEs,
- desktop app shell, live runner, Tauri bridge, local settings, and event store.

No implementation was delegated to Claude Code. The requested output was
planning/advice only.

## Recommendation

The advisory recommended making the next large PR an **app-shell
decomposition** rather than a new behavior slice.

The reason was practical: the native workbench now has enough real surface area
that a large root component would slow down every later change. Before adding
provider registry, approval forwarding, SQLite snapshots, or more live runner
behavior, the root app should become a composition shell and hand off work to
panes, hooks, and runner helpers.

## Accepted Direction

I accepted the recommendation and used it to guide this implementation loop:

- extract the session rail, timeline, inspector, and command strip,
- keep domain-specific UI under local ownership instead of hiding it behind a
  generic component abstraction,
- move derived state and action handlers out of the root app,
- move live runner prelude/completion/stream helper logic under `runs/*`,
- add focused Vitest coverage for helper boundaries,
- avoid new Tauri commands, new event types, provider calls, or persistence
  schema changes in this PR.

## Deferred Work

The advisory explicitly treated these as later slices:

- approval forwarding into Claude Code,
- provider registry and model catalog UI,
- persistence snapshot materialization,
- inspector per-tab module splitting,
- live resume CI hardening beyond the current smoke/e2e coverage,
- OpenCode/Cline implementation routes.

## Acceptance Criteria

- `apps/desktop/src/app.tsx` is small enough to review as a composition root.
- Pane modules own the visible workbench surfaces.
- Runner helpers can be tested without rendering the app.
- Existing `pnpm verify` and Playwright workflow remain green.
- The PR commits no API key, token, raw local Claude log, or private session
  transcript.
