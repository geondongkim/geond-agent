# Workbench UX Quality Bar

`geond-agent` should aim for Codex-level workbench quality in a measurable way:
not by copying Codex UI code, but by adopting verifiable interaction,
rendering, and safety standards.

## Quality Principles

- Event-driven rendering: UI state changes are derived from normalized backend
  events and persisted session snapshots.
- Adapter-neutral controls: backend picker, model picker, approvals, terminal
  output, diffs, and metrics do not depend on one adapter package.
- Reviewable actions: every command, tool call, diff, approval, and recovery
  path gives the user enough context to understand what will happen next.
- Local-first safety: secrets, account state, and provider credentials stay in
  local-only stores outside tracked source files.
- Bilingual baseline: English and Korean UI strings are supported from the
  start, while agent response language remains a separate preference.

## Verifiable UX Standards

| Area | Minimum bar | Verification |
| --- | --- | --- |
| Event protocol | Session lifecycle, assistant text, plan updates, tool calls, command output, diffs, approvals, run attempts, warnings, and errors have normalized event shapes. | Fixture replay tests reconstruct the same workbench state from the same event stream. |
| Backend/model picker | Backend adapter, provider route, model profile, and routing mode are separate controls and are captured in a per-session snapshot. | Unit tests cover manual mode, auto placeholder mode, unavailable capability states, and persisted snapshot rendering. |
| Approval UX | Command, patch, permission, and network/MCP approvals show request identity, reason, affected files or command, and available decisions. | Snapshot tests cover approve/reject/cancel states, keyboard navigation, and queued approval behavior. |
| Diff review | File changes render with stable paths, change counts, and enough context to approve safely. | Snapshot tests cover add/update/delete/rename, long lines, small widths, and Korean UI labels. |
| Terminal output | Streaming output is readable, bounded, searchable later, and never shifts layout unpredictably. | Fixture tests cover running, succeeded, failed, truncated, and interrupted command states. |
| Run attempts | Live Claude runs persist redacted attempt metadata, status, event counts, parse warnings, and exit codes without storing raw logs or secret values. Recovery drafts can be generated from that evidence. | Unit, native SQLite, and e2e tests cover started/updated run attempt events, redaction, materialized inspector rendering, and side-chat follow-up generation. |
| Timeline scale | Long sessions keep the first context-setting events and latest activity visible without rendering every middle event by default. Users can still expand the full timeline when needed. | Unit tests cover head/tail windowing, and UI labels disclose how many events are compacted. |
| Inspector refresh | Materialized inspector reads are driven by context/tool/command/diff/usage/run-attempt evidence changes, not by every assistant text stream chunk. | Unit tests cover a stable evidence signature for timeline-only changes and a changed signature when inspector evidence changes. |
| Metrics | Cost, quota, context window, token usage, and backend capability metadata are shown only when adapters provide them. | Tests cover present, missing, stale, and unavailable metadata states. |
| Settings/secrets | UI settings may persist locally; raw API keys and provider tokens are never in tracked settings payloads. | Secret scans run in verification and settings serializers expose presence flags, not raw secrets. |
| Evidence prompts | File/workspace evidence remains metadata-only in local persistence, and any metadata forwarded to a backend/provider prompt is disclosed in the UI. | E2E tests verify the Files inspector prompt-boundary notice; dispatch tests must verify prompts contain metadata only, never raw private file content. |
| Localization | `en` and `ko` strings cover visible workbench settings and picker labels. | Type checks require both locales to define the same keys; tests cover fallback to `en`. |
| Recovery | Failed adapter start, missing CLI, unavailable model, denied approval, and interrupted command states have clear next actions. | Fixture tests cover each failure state without requiring a real provider key. |
| Layout quality | Dense workbench surfaces remain readable at narrow and wide sizes. | `pnpm test:e2e:layout` runs focused compact and wide layout guards and leaves screenshot artifacts for CI review. Full e2e remains split by layout, context, settings, and runner/approval surfaces. |

## Initial Implementation Order

1. Define normalized workbench event and session snapshot types.
2. Add backend/model selection metadata types without provider calls.
3. Add fixture-driven reducer tests for event replay.
4. Add UI settings coverage for language, agent response language, backend,
   provider route, model profile, and routing mode.
5. Add approval and diff snapshot tests once concrete UI components exist.
6. Add usage/quota/cost display only after adapters expose metadata safely.

## Out Of Scope For The First Slice

- GitHub Copilot SDK dependency.
- Real Cline, OpenCode, Goose, or OpenHands execution.
- Raw Claude Code log or private transcript persistence.
- Provider API calls or account introspection.
- API key storage in source-controlled settings.
- Third-party source code import.

## Acceptance Criteria For "Codex-Level"

The workbench can claim the Codex-level quality bar for a feature only when:

- the feature is event-driven and replayable from fixtures,
- state survives session resume through a documented snapshot shape,
- approvals and risky actions have explicit decision states,
- keyboard and pointer flows are covered by tests,
- compact and wide layouts have focused screenshot-backed layout guards,
- English and Korean UI labels are complete,
- secret scans remain clean,
- failure and recovery states are rendered, not hidden in logs.
