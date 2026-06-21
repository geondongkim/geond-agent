# GLM 5.2 Workbench Advisory - 2026-06-22

This note captures the Claude Code `opus` route advisory requested before the
next implementation push. The raw stream-json output was kept local under
`/tmp/geond-agent-glm52-advisory/` and is not committed.

## Scope

GLM 5.2 was asked to review the current `main` state through Claude Code with
read-only tool access. The prompt covered:

- architecture, roadmap, UX quality bar, backend/model selection roadmap, and
  Claude Code route decision docs,
- OSS workbench research,
- UI workbench and Claude Code bridge READMEs,
- real Claude `stream-json` normalizer,
- workbench event/replay/projection model,
- desktop React shell,
- Tauri runner, local settings, SQLite event store, and Playwright workflow.

No files were modified by Claude Code, and no secret values were requested,
printed, or committed.

## Advisory Summary

The advisory judged the current direction as sound: geond-agent is now a working
Tauri/React local workbench with adapter-neutral events, real Claude Code
`stream-json` normalization, local settings, SQLite event storage, usage
metadata, dark three-pane UI, and CI-backed e2e coverage.

The strongest choices it called out were:

- adapter-neutral `WorkbenchEvent` ownership in `packages/ui-workbench`,
- Claude-specific mapping isolated in `packages/claude-code-bridge`,
- pure replay/projection boundaries,
- strict Tauri runner guardrails around the `claude` executable and
  `--bare -p --verbose --output-format stream-json`,
- local-only settings and event persistence that avoid provider secrets and raw
  private logs,
- visible session selection metadata and usage reporting.

## Accepted Critique

The most actionable critique is that live execution is now real enough that
runner safety needs to move ahead of new surface area:

- A live Claude process can run indefinitely, but the UI has no cancel path.
- The Tauri command has no wall-clock timeout.
- stdout/stderr are streamed to the renderer, but are also accumulated in memory
  without a diagnostic cap.
- UI event dedupe still relies on `JSON.stringify(event)`, which is fragile once
  multiple event sources can emit semantically equivalent records.
- `.env.local` parsing is intentionally small, but malformed lines should be
  surfaced instead of silently ignored.

I agree with this priority. The next implementation should make the Claude-first
route more operationally safe before adding OpenCode, auto routing, approval
forwarding, or new provider calls.

## Next Large PR Plan

Implement live runner guardrails:

1. Add a Tauri-side process registry keyed by stream channel/session ID.
2. Add a `cancel_claude_code_stream` command that terminates a running Claude
   process and lets the renderer append interrupted/failure events.
3. Add a bounded `timeoutMs` field to runner requests with a conservative
   default and maximum.
4. Cap returned stdout/stderr diagnostic buffers while continuing to stream
   lines to the UI.
5. Replace `JSON.stringify(event)` dedupe with a structural event key.
6. Add tests for timeout, output truncation, env parse errors, structural event
   identity, and cancel UI behavior where feasible.

## Deferred

Do not do these in this slice:

- GitHub Copilot SDK dependency,
- real provider API calls outside Claude Code's external process route,
- OpenCode/Cline expansion,
- auto routing policy,
- approval forwarding into Claude Code,
- absorbing `geond-agent-protocol` into this repo,
- storing API keys, tokens, raw Claude logs, or private session transcripts.

## Acceptance Criteria

- Existing `pnpm verify` and `pnpm test:e2e` pass.
- CI passes before merge.
- Cancelling a live run clears the busy UI state and records an interrupted
  command output plus failed session lifecycle.
- Timeout failures are visible as normalized events.
- Long process output cannot grow the returned diagnostic buffer without bound.
- Structural dedupe is covered by unit tests.
- Secret-value scans find no committed key/token values.
