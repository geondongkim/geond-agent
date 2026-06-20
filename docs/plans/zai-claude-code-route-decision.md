# Z.ai Claude Code Route Decision

This note compares the Claude Code deep validation results against the earlier
OpenCode and Cline evaluations.

## Decision

Use Claude Code as the first-class adapter/protocol validation route for
`geond-agent`, but keep OpenCode as the default cost-controlled implementation
route until the Claude Code adapter normalizes stream events.

Practical default:

- Claude Code: use for backend adapter work, ACP/session/resume/event-shape
  work, and hard feature-design slices where usage/cost metadata matters.
- OpenCode: use for routine docs/code implementation tasks and as the control
  route when evaluating Z.ai provider quality.
- Cline: keep as a viable alternate route, preferably non-JSON with lower
  thinking settings, but do not make it the default route yet.

## Evidence

| Route | Evidence | Verdict |
| --- | --- | --- |
| Claude Code smoke | Route succeeded, read repo, no edits, structured JSON result. | Good preflight route. |
| Claude Code Task 3 | Correct bug fix and strong fixtures; broader public API than needed. | Good quality, higher review burden. |
| Claude Code Task 4 | Strong design reference and docs; wider than the minimal accepted slice. | Good feature design route. |
| Claude Code session probe | `stream-json`, usage metadata, session id, and `--resume` worked. | Best route for adapter work. |
| OpenCode Tasks 1/3/5 | Focused diffs, readable workflow, good docs/code alignment. | Best current default for cost-controlled work. |
| Cline Tasks 2/4 | Usable but noisier and needed more controller cleanup. | Keep as backup/comparison route. |

## Important CLI Findings

- `--output-format stream-json` requires `--verbose`.
- Reusing the same `--session-id` for a second turn fails because the session is
  already in use; use `--resume <session-id>` for continuation.
- `--bare -p --output-format json --no-session-persistence` is a good smoke
  mode.
- `--bare -p --verbose --output-format stream-json` is a good adapter/event
  probe mode.

## Provider / Tool / Workbench Verdict Split

| Verdict | Decision |
| --- | --- |
| Z.ai provider route | Pass. Claude Code, OpenCode, and Cline all produced useful paid evaluation evidence. |
| Claude Code as a tool | Pass for adapter/event work; maybe for small fixes when budget matters. |
| geond-agent workbench model | Pass with adapter work needed. Current events can represent Claude concepts, but a normalizer is required. |

## Next Implementation Slice

The next implementation slice should not re-run the same code tasks. It should
add a Claude Code event-normalization boundary that converts Claude Code
`stream-json` into the existing workbench event model using sanitized fixtures
derived from the probe shape, not raw logs or secrets.

