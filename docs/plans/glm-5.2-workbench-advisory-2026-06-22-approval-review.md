# GLM 5.2 Workbench Advisory - Approval Review

This note records the Claude Code `opus` advisory requested before this
implementation loop. Claude Code was routed through the local Z.ai
Anthropic-compatible environment. The raw JSON output and local probe logs were
not committed.

## Prompt Scope

GLM 5.2 was asked to inspect the current implementation after the provider
registry and picker slice:

- roadmap, architecture, desktop stack ADRs, and UX quality bar,
- Claude Code route decision and session continuity docs,
- UI workbench event/replay/projection/settings code,
- Z.ai provider catalog and Claude Code backend metadata,
- desktop runner, panes, persistence boundary, and e2e tests.

No file edits were delegated to Claude Code. The output was planning and
prioritization advice only.

## Recommendation

The advisory recommended the next large PR should be **approval forwarding probe
and review UX hardening**.

The key finding was that live Claude Code execution still defaulted to a safe
`plan` permission mode, while the review UI mainly exercised synthetic approval
fixtures. That left a gap between the default Claude Code implementation route
and the workbench's approval queue:

- `createRunnerRequest` did not pass a persisted permission mode,
- real Claude Code permission-denial output had not been normalized,
- approval capability was represented as metadata but not tested from observed
  `stream-json` output,
- approval cards lacked keyboard handling, risk labels, and direct diff or
  terminal review jumps.

## Accepted Direction

I accepted the recommendation with one guardrail: the first slice should map
observed permission-denial events into local review state, but it should not
attempt interactive stdin approval forwarding yet.

This PR therefore:

- adds a persisted `defaultPermissionMode` session default,
- keeps `bypassPermissions` out of normal UI settings,
- passes the permission mode into Claude Code runner requests,
- maps Claude Code `result.permission_denials` into pending
  `approval.requested` events,
- adds sanitized permission-denial fixtures and tests,
- improves approval review cards with risk labels, keyboard approve/reject, and
  diff/terminal review jumps.

## Deferred

- Interactive approval forwarding back into a still-running Claude Code process
  remains deferred until a stable protocol or stdin shape is confirmed.
- Policy presets beyond `ask-first` remain deferred.
- SQLite approval persistence is still covered by the event-store boundary, not
  by a dedicated approval table implementation.
- OpenCode/Cline approval-shape comparison remains a later horizontal-expansion
  step.

## Acceptance Criteria

- Permission mode is a typed, persisted session default.
- Live runner requests include that permission mode.
- Observed Claude Code permission denials replay into stable workbench approval
  state.
- Approval review UI supports pointer and keyboard resolution paths.
- Approval UI has English/Korean labels for new review states.
- Raw Claude logs, local probe output, API keys, tokens, and private session
  state are not committed.
