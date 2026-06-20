# Z.ai Evaluation Scorecard

Use this scorecard for every queued task in
`docs/plans/zai-evaluation-task-queue.md`.

## Companion Docs

This scorecard is one step in the evaluation flow:

- [Z.ai coding tools setup](../guides/zai-coding-tools-setup.md)
- [Z.ai GLM Coding Plan evaluation plan](zai-coding-plan-evaluation.md)
- [Z.ai pre-subscription readiness](zai-pre-subscription-readiness.md)
- [Z.ai evaluation task queue](zai-evaluation-task-queue.md)
- [Z.ai Claude Code route decision](zai-claude-code-route-decision.md)

The run model lives in code at
`packages/ui-workbench/src/evaluation/evaluation-run.ts`. The field names used in
the Model Mapping table below match that module exactly.

## Task Metadata

| Field | Value |
| --- | --- |
| Task ID |  |
| Task title |  |
| Tool | Claude Code / Cline / OpenCode |
| Model or route |  |
| Branch/worktree |  |
| Started at |  |
| Finished at |  |
| Verification commands |  |
| Accepted for normal work? | Yes / No / Maybe |

## Model Mapping

The evaluation run model lives in
`packages/ui-workbench/src/evaluation/evaluation-run.ts`. It is a plain,
framework-neutral TypeScript value object. It does not open a database, render
UI, call a provider, or store secrets, tokens, or provider account state. Each
field maps back to a scorecard concept:

| Scorecard field | Model type |
| --- | --- |
| Task ID | `EvaluationRun.taskId` |
| Task title | `EvaluationRun.title` |
| Tool (Claude Code / Cline / OpenCode) | `EvaluationRun.tool` (`EvaluationToolName`) |
| Model or route | `EvaluationRun.modelOrRoute` |
| Branch/worktree | `EvaluationRun.branchOrWorktree` |
| Started at / Finished at | `EvaluationRun.startedAt` / `finishedAt` |
| Verification commands | `EvaluationRun.verificationCommands` |
| Accepted for normal work? | `EvaluationRun.accepted` (`EvaluationAcceptance`) |
| Task lifecycle | `EvaluationRun.status` (`EvaluationTaskStatus`: queued, running, passed, failed, inconclusive) |
| Score (1-5 scale) | `EvaluationAreaScore.score` (`EvaluationScore`) |
| Scorecard area row | `EvaluationAreaScore` |
| Whole scorecard | `EvaluationScorecard` (a record keyed by `EvaluationScoreArea`) |

The six scorecard areas map one-to-one to `EvaluationScoreArea` values:

| Area (scorecard) | `EvaluationScoreArea` |
| --- | --- |
| Repo understanding | `repo-understanding` |
| Edit quality | `edit-quality` |
| Verification | `verification` |
| Recovery | `recovery` |
| Cost/value | `cost-value` |
| Workflow fit | `workflow-fit` |

The model keeps the recording rules from
`docs/plans/zai-evaluation-task-queue.md` in one place. Notes captured under
"Task Notes" map to `EvaluationRun.notes`; area-level reviewer comments map to
`EvaluationAreaScore.notes`.

## Scoring Scale

| Score | Meaning |
| --- | --- |
| 1 | Failed the task or created risky unrelated work. |
| 2 | Partially useful, but required heavy correction. |
| 3 | Usable with review, but had notable gaps or friction. |
| 4 | Good result with minor review comments. |
| 5 | Strong result that fit the repo and workflow naturally. |

## Scorecard

| Area | 1 | 3 | 5 | Score | Notes |
| --- | --- | --- | --- | --- | --- |
| Repo understanding | Missed the right files or boundaries. | Found the main area but needed guidance. | Quickly found ownership boundaries and relevant docs/code. |  |  |
| Edit quality | Broad, risky, or unrelated edits. | Mostly relevant edits with some cleanup needed. | Small, focused, reviewable changes matching local style. |  |  |
| Verification | Did not run or identify useful checks. | Ran some checks but missed obvious validation. | Ran the right repo checks and explained failures clearly. |  |  |
| Recovery | Got stuck or spiraled after errors. | Recovered with guidance or after extra attempts. | Diagnosed errors and corrected course cleanly. |  |  |
| Cost/value | Took longer than manual work or wasted usage. | Saved some time but required close supervision. | Clearly saved time for the subscription cost. |  |  |
| Workflow fit | Felt awkward or hard to trust. | Fit some parts of the workflow. | Felt natural for daily local repo work. |  |  |

## Task Notes

```text
What worked:

What failed:

Interesting behavior:

Review comments:

Follow-up needed:
```

## Decision Notes

| Question | Answer |
| --- | --- |
| Would this result be accepted after normal review? |  |
| Did the tool preserve secrets and local-only state? |  |
| Did the tool respect package boundaries? |  |
| Did the tool improve confidence in subscribing? |  |
| Should this tool stay in the next evaluation round? |  |
