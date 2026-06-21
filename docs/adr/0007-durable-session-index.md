# ADR 0007: Durable Session Index and Per-Session Projection

## Status

Accepted

## Context

The desktop workbench now has a real local event store, session resume metadata,
Claude Code `stream-json` normalization, backend/model picker metadata, and
approval review. The next scaling risk is that startup and stream appends can
force global replay of every event across every session.

For a daily-use workbench, the session rail, workspace summaries, backend status,
pending approval counts, and resumable state must be available without loading
every session's detailed timeline.

## Decision

Introduce an adapter-neutral durable session index:

- shared `WorkbenchSessionIndex` reducer in `packages/ui-workbench`,
- `workbench_sessions` SQLite table in the Tauri app data store,
- Tauri `list_workbench_sessions` command,
- startup that loads the session index first and then loads only the active
  session's event stream,
- lazy loading for selected session events.

The normalized `WorkbenchEvent` stream remains the source of truth. The session
index is a materialized projection that can be rebuilt from events. It stores
summary metadata only, not raw agent logs or provider secrets.

## Consequences

The workbench can show a multi-session rail from compact durable metadata while
keeping detailed replay bounded to the active session. Resume metadata such as
external adapter session ids survives restart without global replay.

The index is intentionally narrower than future materialized tables. Dedicated
approval, usage, diff, command output, and tool-call tables remain future work
until query needs justify them.
