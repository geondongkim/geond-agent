# Z.ai Claude Code Route Decision

This note compares the Claude Code deep validation results against the earlier
OpenCode and Cline evaluations.

## Decision

Use Claude Code as the default implementation route for `geond-agent`'s next
workbench slices.

This is an implementation sequencing decision, not a permanent single-backend
product lock-in. The workbench stays adapter-neutral, but the first paved path
should be Claude Code because it exercises the external CLI/ACP boundary,
session/resume behavior, `stream-json` event shape, permission policy, model
selection aliases, and usage metadata that `geond-agent` needs to understand
for the long-term product.

Practical default:

- Claude Code: use for backend adapter work, ACP/session/resume/event-shape
  work, routine implementation slices, and hard feature-design slices where
  usage/cost/model metadata matters.
- OpenCode: defer as the next horizontal-expansion route and keep it as a
  comparison/control path when Z.ai provider quality needs to be separated from
  Claude Code tool behavior.
- Cline: keep as a viable alternate route, preferably non-JSON with lower
  thinking settings, but do not make it the default route yet.

The small-task cost/value caveat is understood. Z.ai's Claude Code route may
select a higher model tier than a Haiku-class path for some tasks. Even so,
Claude Code remains the default implementation route because it gives better
evidence for the adapter and workbench UX foundations.

## Evidence

| Route | Evidence | Verdict |
| --- | --- | --- |
| Claude Code smoke | Route succeeded, read repo, no edits, structured JSON result. | Good preflight route. |
| Claude Code Task 3 | Correct bug fix and strong fixtures; broader public API than needed. | Good quality, higher review burden. |
| Claude Code Task 4 | Strong design reference and docs; wider than the minimal accepted slice. | Good feature design route. |
| Claude Code session probe | `stream-json`, usage metadata, session id, and `--resume` worked. | Best route for adapter work. |
| OpenCode Tasks 1/3/5 | Focused diffs, readable workflow, good docs/code alignment. | Strong next horizontal-expansion/control route. |
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
| Claude Code as a tool | Pass as the default implementation route, with cost review on small tasks. |
| geond-agent workbench model | Pass with adapter work needed. Current events can represent Claude concepts, but a normalizer is required. |

## Next Implementation Slice

The next implementation slice should not re-run the same code tasks. It should
add a Claude Code event-normalization boundary that converts Claude Code
`stream-json` into the existing workbench event model using sanitized fixtures
derived from the probe shape, not raw logs or secrets.

OpenCode horizontal expansion should come after this Claude Code path has a
stable adapter boundary, not before.

## GLM 5.2 Advisory Follow-up

Before the next implementation push, Claude Code was routed through the Z.ai
`opus` alias to have GLM 5.2 review the repo docs, current implementation, and
next work. The most useful critique was that the existing bridge fixture looked
like workbench-shaped synthetic events rather than real Claude Code
`stream-json` envelopes. That advice is accepted: the next code slice should
prefer a true envelope normalizer before deeper process control, persistence, or
OpenCode comparison work.
