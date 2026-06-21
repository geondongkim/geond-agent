# GLM 5.2 Workbench Advisory - Durable Session Index

This note records the Claude Code `opus` advisory requested before this
implementation loop. Claude Code was routed through the local Z.ai
Anthropic-compatible environment. The raw JSON output was kept under `/tmp` and
was not committed.

## Prompt Scope

GLM 5.2 was asked to inspect the current `main` state after the approval review
slice:

- roadmap, architecture, desktop stack ADRs, and UX quality bar,
- Claude Code route decision, session continuity, and approval probe docs,
- Tauri/Rust command boundary and SQLite persistence,
- desktop startup, runner, panes, settings, and persistence code,
- UI workbench replay/projection/controller/settings code,
- Claude Code bridge and Z.ai provider package boundaries.

No file edits were delegated to Claude Code. The output was planning and
prioritization advice only.

## Recommendation

The advisory recommended the next large PR should be **durable session index and
per-session projection**.

The main finding was that the workbench already had SQLite event persistence,
session resume, live runner, picker metadata, and approval review, but startup
and append still leaned on global event replay:

- startup loaded every event from SQLite,
- the controller projected all known events on every append,
- streaming long Claude Code runs could repeatedly replay unrelated sessions,
- resume metadata was derived from full event replay rather than a durable
  session summary.

## Accepted Direction

I accepted this recommendation. The next slice should make session lists and
resume metadata durable while keeping active-session details replayed from the
normalized event stream.

The implemented direction is:

- add an adapter-neutral `WorkbenchSessionIndex` reducer in
  `packages/ui-workbench`,
- keep session list, workspace summaries, backend status, pending approval
  counts, warnings, errors, and resumable state in that index,
- keep full timeline/diff/terminal/usage state as active-session replay,
- add a `workbench_sessions` SQLite table materialized from `workbench_events`,
- backfill the session index from existing event rows,
- load the session index at startup and then load only the active session's
  events,
- lazy-load a selected session's events when the user switches sessions.

## Deferred

- Interactive approval forwarding into a running Claude Code process.
- Dedicated SQLite tables for approvals, usage, diffs, tool calls, and command
  output summaries.
- OpenCode/Cline horizontal expansion.
- Auto routing policy.
- Claude Code local session-list import and fork/divergent-history UX.

## Acceptance Criteria

- Session index projection matches full replay for existing fixture session
  lists, workspace summaries, and backend status.
- A persisted resumable session can appear in the session rail before its full
  event stream is loaded.
- Startup no longer needs to load every session's events to render the session
  list.
- SQLite creates, backfills, updates, lists, and deletes session index rows.
- No provider secrets, raw Claude logs, raw transcripts, or local tool state are
  stored in the index.
