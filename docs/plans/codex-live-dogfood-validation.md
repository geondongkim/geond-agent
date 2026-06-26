# Codex Live Dogfood Validation

Date: 2026-06-26

This note records evidence-safe Codex CLI dogfood results for the `codex-live`
runner path. Raw JSONL, stderr, generated files, and isolated Codex home state
were written only under ignored local paths:

- `output/local/codex-live-dogfood/`

Do not commit raw Codex logs, local session state, account state, or private
transcripts.

## Local Environment

- Codex CLI: `codex-cli 0.142.2`
- Repo branch during dogfood: `codex/dogfood-codex-live-runner`
- Successful smoke mode: `codex exec --json --sandbox read-only`
- Workspace-write smoke mode: `codex exec --json --sandbox workspace-write`
- Resume probe mode: isolated `CODEX_HOME=output/local/codex-live-dogfood/codex-home`

## Evidence-Safe Results

| Probe | Exit | Observed shape | Decision |
| --- | ---: | --- | --- |
| Read-only success smoke | 0 | 10 JSONL records: `thread.started`, `turn.started`, `item.started`, `item.completed`, `turn.completed`; item types included `agent_message`, `command_execution`, and `error`; usage metadata was emitted. | Live success path can feed the workbench event stream. |
| Invalid model failure smoke | 1 | 6 JSONL records: `thread.started`, `turn.started`, top-level `error`, `turn.failed`, and item `error`; stderr signal contained `404`, `invalid`, and `model`. | Add `provider_model` classification with `lower_model` guidance. |
| Ignored workspace-write smoke | 0 | 27 JSONL records; item types included `agent_message`, `command_execution`, `file_change`, and `error`; generated marker file stayed under ignored `output/local`. | `file_change` can be treated as live dogfood evidence for `diff.emitted`. |
| Isolated resume probe | 1 / 1 | Thread id was emitted, but both isolated-home turns failed with `401`/auth signals. | Resume requires a deliberate auth/session-state policy before productizing. |

## Implemented From This Dogfood

- `codex-live` now emits a Codex-specific prelude with selection snapshot,
  command preview, local-only warning, and plan items.
- `codex-live` failure paths now use the shared live runner issue classifier.
- `provider_model` issue kind represents model/route mismatch such as an
  invalid Codex model alias and recommends `lower_model`.
- Codex live completion/failure events use `codex-cli-live-prelude` command ids.
- Codex backend capability metadata marks usage reporting and `file_change`
  diff events as supported by local dogfood evidence.

## Remaining Gaps

- Approval fidelity is still unknown. The probes did not surface a distinct
  approval event shape.
- MCP/tool-call fidelity is still unknown. The probes observed local command
  executions, not MCP tool calls.
- Session resume continuity is not ready for default UX. A non-ephemeral Codex
  run needs explicit local session-state consent, an auth policy, and a clear
  storage boundary before geond-agent should expose it as a polished workflow.
- Raw failure text must stay redacted and summarized. Product reports should
  keep event counts, issue kinds, route/model ids, and sanitized status only.

## Next Product Slice

1. Add a first-run warning for Codex resume: resume needs Codex local session
   state and should not be enabled by default.
2. Add a Codex route/model readiness hint when the model alias is unknown or
   host-mediated.
3. Add a dogfood-only approval probe once a safe interactive approval scenario
   exists.
4. Keep command output, file changes, and usage metadata in normalized
   `WorkbenchEvent` form; never export raw Codex JSONL by default.
