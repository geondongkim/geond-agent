# geond-agent-protocol Integration Strategy

`geond-agent-protocol` remains a separate repository. `geond-agent` should learn
from it and optionally integrate with it later, but should not absorb its source
code, storage schema, or controller policy into this monorepo.

## Role Split

| Project | Role |
| --- | --- |
| `geond-agent` | Native/local workbench, live Claude Code route, UI state, approvals, diffs, terminal, model/backend picker. |
| `geond-agent-protocol` | Shared evidence layer, MCP/CLI contracts, cross-agent memory, reservations, handoffs, read-only dashboard models. |

The first `geond-agent` implementation should own its local live-session state.
`geond-agent-protocol` should be treated as a later optional export/import and
shared-memory target.

## Lessons To Use

The protocol repo's Codex, Claude Code, and GitHub Copilot Chat work points to
these product lessons:

- Tool-local storage formats are useful but unstable. Treat Codex, Claude Code,
  Copilot Chat, OpenCode, and Cline storage as best-effort adapter inputs, not
  stable vendor APIs.
- Raw transcripts, thinking blocks, stdout/stderr, and debug logs can be large
  and sensitive. The workbench should default to compact events and redacted
  evidence, not raw log persistence.
- Workspace identity must be explicit. Folder hashes, encoded Claude project
  paths, and moved local directories are not reliable enough by themselves.
- Read models should be derived. UI state should come from normalized events and
  projections instead of parsing backend-private records directly in React.
- Shared memory is powerful, but it should remain opt-in. A single-user local
  workbench should not require PostgreSQL, MCP setup, or cloud/shared storage.

## Weakness Mitigation

| Risk from protocol-style integration | Mitigation in `geond-agent` |
| --- | --- |
| PostgreSQL/pgvector setup is too heavy for a desktop MVP. | Use local SQLite for sessions/events/snapshots first; keep protocol export optional. |
| Vendor local formats may change. | Normalize through adapter fixtures and versioned parser metadata; never bind UI state to raw vendor records. |
| Raw agent transcripts may contain secrets or personal data. | Redact before persistence beyond ephemeral runtime buffers; store compact summaries/events by default. |
| Shared-memory concepts can broaden MVP scope. | Keep Milestones 1-4 focused on Claude Code live workbench; defer reservations/handoffs/shared dashboard. |
| Protocol controller policy could leak into the UI. | Keep `geond-agent-protocol` as evidence/context only; workbench approvals and runner policy stay local. |
| Workspace aliases can accidentally merge unrelated projects. | Require explicit workspace identity and user-confirmed aliases before importing/exporting history. |

## Improvement Plan

1. Define a `geond-agent` local event envelope that can later map to protocol
   evidence without depending on protocol storage code.
2. Keep adapter fixtures for Claude Code `stream-json` and future OpenCode/Cline
   routes in `geond-agent`.
3. Add a redaction gate before any event is persisted outside in-memory runtime
   buffers.
4. Store source metadata such as backend id, provider route id, model alias,
   tool version, workspace root, git branch, and event schema version.
5. Add optional export later:
   - selected sessions,
   - compact event summaries,
   - diff summaries,
   - verification results,
   - usage metadata,
   - approval decisions.
6. Add optional import later:
   - prior evidence snippets,
   - session summaries,
   - handoffs,
   - reservations,
   - review context.
7. Keep protocol integration behind a feature flag or explicit settings surface.

## Strength Maximization

Use `geond-agent-protocol` where it is strongest:

- cross-agent memory after the single-user workbench is stable,
- provenance and "why did this change?" evidence,
- reservations and handoffs for multi-agent coordination,
- read-only dashboard views for PM/reviewer visibility,
- source-filtered search across Codex, Claude Code, Copilot Chat, and future
  adapters,
- usage and benchmark evidence for comparing provider/tool value.

Do not use it as the first live UI state store. The workbench needs fast,
local, deterministic session state before shared evidence is useful.

## Recommended Path

For Milestones 1-4:

- `geond-agent` owns local normalized `WorkbenchEvent` streams.
- Reducers derive visible UI state.
- React renders derived state only.
- SQLite stores local sessions/events/snapshots.
- Tauri app data stores small non-secret preferences.
- `geond-agent-protocol` is documented as a future optional integration target.

For Milestone 5 and later:

- add protocol export/import research,
- map local events into protocol evidence records,
- import compact review context before a session starts,
- optionally write changesets, validation evidence, and handoff summaries to
  protocol storage or MCP.

## Non-Goals

- Do not absorb `geond-agent-protocol` into this repository.
- Do not require PostgreSQL or MCP for the desktop MVP.
- Do not copy protocol implementation code without an explicit dependency and
  compatibility decision.
- Do not persist API keys, tokens, provider account state, raw private
  transcripts, or raw local tool session files in portable exports.
