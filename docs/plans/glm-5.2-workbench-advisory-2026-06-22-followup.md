# GLM 5.2 Workbench Advisory Follow-up

This note records the second Claude Code `opus` route advisory requested after
the live runner guardrails landed. Claude Code was run in read-only mode against
repo files and wrote only a local `/tmp` advisory artifact. Raw stream output is
not committed.

## Advisory Input

The prompt asked GLM 5.2 to review the post-guardrail workbench state:

- dark 3-pane Tauri/React workbench,
- Claude-first external runner,
- real `stream-json` normalizer,
- usage inspector,
- SQLite event store,
- workspace picker,
- live runner timeout/cancel/truncation guardrails,
- structural event identity,
- CI/e2e coverage.

No secret values were requested, printed, or committed.

## Decision

The advisory recommended **Session Resume & Continuity** as the next large PR,
ahead of app-shell decomposition, approval forwarding, or provider registry
work.

I agree with that recommendation because resume/continuity exercises every
important boundary that future work depends on:

- the SQLite event store,
- adapter-neutral session lifecycle state,
- Claude Code's `--resume` route,
- per-session backend/model selection snapshots,
- separation of workbench session ids from external adapter conversation ids.

## Accepted Implementation Direction

- Add an adapter-neutral `session.adapter.linked` workbench event.
- Store external adapter session mappings in replayed session snapshots.
- Treat the workbench session id as the UI/event-store owner.
- Treat the Claude Code `session_id` as adapter-private external session
  metadata.
- Use `--session-id <workbenchSessionId>` for fresh Claude Code runs.
- Use `--resume <externalSessionId>` for resumed Claude Code runs.
- Keep the Tauri stream channel id equal to the workbench session id.
- Do not expose a UI for pasting arbitrary external session ids in this slice.
- Do not add Claude Code session listing, fork, ACP resume, approval forwarding,
  provider registry, or auto-routing yet.

## Acceptance Criteria

- Normalized real Claude `system/init` records emit both `session.lifecycle` and
  `session.adapter.linked` events.
- Live streaming routes events by workbench session id even when the Claude
  command uses `--resume`.
- Completed, adapter-linked sessions project as resumable.
- Resume appends new events to the existing workbench session instead of
  creating a second local session.
- Rust command validation accepts safe `--resume` values and rejects empty,
  flag-like, duplicate, or mixed `--resume`/`--session-id` shapes.
- Tests cover reducer/projection, stream-json normalization, command building,
  and Tauri runner validation.

## Deferred

- App-shell decomposition remains useful, but should be done pane-by-pane when a
  feature requires it.
- Approval forwarding needs a confirmed Claude Code permission event shape.
- Fork needs a separate product model for divergent histories.
- Provider registry and auto-routing should wait until manual session
  continuity is stable.
