# Z.ai Evaluation Run: Claude Code Session Probe

This run records a Claude Code session/resume and `stream-json` shape probe for
the `geond-agent` workbench event boundary.

## Task Metadata

| Field | Value |
| --- | --- |
| Task ID | Claude Code session probe |
| Task title | Session, resume, and event-shape validation |
| Tool | Claude Code 2.1.183 |
| Model or route | `sonnet` alias through Z.ai Anthropic-compatible route |
| Branch/worktree | `codex/eval-claude-code-session-probe` in `/Users/geondongkim/geond-agent-claude-session-probe` |
| Session ID | `eea4a51c-d7ef-4b16-9742-60b81f5630f2` |
| Started at | 2026-06-21 04:51 KST |
| Finished at | 2026-06-21 04:52 KST |
| Verification commands | `git status --short --branch`, `pnpm --version`, controller secret scan |
| Accepted for normal work? | Yes |

## Result Summary

The probe used two turns against the same Claude Code session. Turn 1 used an
explicit `--session-id` and successfully read `README.md` plus the workbench
event types, then ran read-only shell commands. A second command using the same
`--session-id` failed with `Session ID ... is already in use`; resuming the
session required `--resume <session-id>`.

Turn 2 with `--resume` succeeded, reported prior context availability, and
mapped Claude Code stream concepts to the normalized workbench event categories.
No tracked files changed.

## Event Shape Findings

| Claude Code stream-json concept | Workbench event fit |
| --- | --- |
| `system:init`, `system:status`, result success/failure | `session.lifecycle` |
| assistant content deltas and final result text | `assistant.text.delta` / `assistant.text.completed` |
| `Read`, `Bash`, `Edit` tool use records | `tool.call.started` / `tool.call.updated` |
| `Bash` command output and exit state | `command.output` |
| Edit-generated file changes | candidate input to `diff.emitted` after adapter normalization |
| permission mode / approval-related events | candidate input to `approval.requested` / `approval.resolved` |
| stderr, failed result, API errors | `warning` / `error` |

The current workbench model can represent the important Claude Code concepts,
but an adapter still needs to normalize Claude's raw stream into stable
geond-agent events.

## Scorecard

| Area | Score | Notes |
| --- | --- | --- |
| Repo understanding | 5 | Correctly identified event/replay/selection boundaries. |
| Edit quality | 5 | No repo edits were made. |
| Verification | 4 | Confirmed command output, session continuity, and clean worktree. |
| Recovery | 5 | The failed second `--session-id` attempt produced a useful CLI rule: resume with `--resume`. |
| Cost/value | 5 | Cheap and high-signal: two turns together reported roughly 0.09 USD. |
| Workflow fit | 5 | Strong evidence that Claude Code is a good first adapter target. |

Average score: 4.8 / 5

## Decision Notes

| Question | Answer |
| --- | --- |
| Would this result be accepted after normal review? | Yes |
| Did the tool preserve secrets and local-only state? | Yes |
| Did the tool respect package boundaries? | Yes |
| Did the tool improve confidence in subscribing? | Yes |
| Should this tool stay in the next evaluation round? | Yes |

