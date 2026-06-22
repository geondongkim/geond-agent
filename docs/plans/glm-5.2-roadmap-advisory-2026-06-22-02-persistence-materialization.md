# GLM 5.2 Roadmap Advisory - Persistence Materialization

This note records the second of four GLM 5.2 advisories requested on
2026-06-22. Claude Code was routed through the Z.ai `opus` alias and asked to
review the current storage model before recommending the next persistence
architecture slice.

The raw JSON response remains local under `/tmp` and is not committed.

## Scope

The advisory reviewed the current SQLite boundary, durable session index,
workbench event append path, and roadmap references to approvals, tool calls,
command outputs, diff summaries, usage metadata, and session snapshots.

No secret values were requested, printed, or committed.

## Recommendation

GLM 5.2 recommended one focused persistence PR:

**schema versioning + transactional append + one materialized approvals table.**

The advisory recommends deferring usage, diff, tool-call, command-output,
session-snapshot, raw-log migration, and export/import tables until those
surfaces have direct feature pull.

## Rationale

The current store already has enough behavior to justify a stronger migration
and approval-state model:

- `workbench_events` and `workbench_sessions` exist,
- the session rail already exposes pending approval counts,
- approval review has visible UI and e2e coverage,
- pending approval ids are currently denormalized as JSON text in the session
  index,
- append/update work should be transactional as the event store grows.

The advisory flags approval state as the first materialization target because
it is both user-visible and cross-session.

## Architecture Slice

The proposed PR should add:

- a `PRAGMA user_version` migration runner,
- ordered migrations that run inside transactions,
- transactional append for workbench events and derived updates,
- a `workbench_approvals` table derived from `approval.requested` and
  `approval.resolved` events,
- query helpers for pending/resolved approvals,
- session index counts derived from the approvals table rather than manually
  synced JSON arrays.

Suggested approval fields:

- `session_id`,
- `approval_id`,
- `kind`,
- `title`,
- `subject`,
- `reason`,
- `status`,
- `decision`,
- `requested_at`,
- `resolved_at`,
- `source_event_id`,
- `updated_at`.

## PR Direction

Recommended PR:

**Add versioned SQLite migrations and materialized approval state.**

Acceptance criteria for that PR should include:

- existing stores initialize at the correct schema version,
- new stores receive the same versioned schema,
- event append and approval materialization are transactional,
- approval counts in the session rail come from materialized approval rows,
- replay compatibility remains intact,
- no raw logs, provider secrets, or account state are stored.

## Deferred

- usage metadata tables,
- diff summary tables,
- command output tables,
- tool call tables,
- session snapshot tables,
- export/import,
- raw Claude log storage.

## Controller Evaluation

This is the strongest foundation slice if the next PR should reduce storage
risk. It also prepares the workbench for the Claude follow-up loop because
approval review becomes queryable state instead of a fragile session-summary
field.

This should be considered either the next PR or the immediate PR after the
Claude print-mode follow-up loop.
