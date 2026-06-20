# Evaluation Run Model

`packages/ui-workbench/src/evaluation/evaluation-run.ts` defines the tracked
metadata shape for Z.ai coding-agent evaluation runs. It is framework-neutral
and stores no provider key, token, local user session state, raw tool log, or
provider account state.

## Purpose

The model lets `geond-agent` compare Claude Code, Cline, and OpenCode runs with
the same scorecard vocabulary while the workbench implementation stays small.

The current product choice is to make Claude Code the default implementation
route first. OpenCode remains a useful horizontal-expansion and comparison
route, but it is deferred until the Claude Code path has a stable adapter/event
normalization surface.

## Field Mapping

| Scorecard concept | Code field or type |
| --- | --- |
| Tool | `EvaluationRun.tool` (`EvaluationToolName`) |
| Task ID | `EvaluationRun.taskId` |
| Task title | `EvaluationRun.title` |
| Lifecycle status | `EvaluationRun.status` (`EvaluationTaskStatus`) |
| Verification commands | `EvaluationRun.verificationCommands` (`string[]`) |
| Scorecard scores | `EvaluationRun.scores` (`EvaluationScorecard`) |
| Notes | `EvaluationRun.notes` |
| Model or route | `EvaluationRun.modelOrRoute` |
| Branch or worktree | `EvaluationRun.branchOrWorktree` |
| Started / finished timestamps | `EvaluationRun.startedAt` / `EvaluationRun.finishedAt` |
| Accepted for normal work | `EvaluationRun.accepted` (`EvaluationAcceptance`) |

## Score Areas

The six score areas are represented as camel-case TypeScript keys:

| Scorecard label | `EvaluationScoreArea` |
| --- | --- |
| Repo understanding | `repo-understanding` |
| Edit quality | `edit-quality` |
| Verification | `verification` |
| Recovery | `recovery` |
| Cost/value | `cost-value` |
| Workflow fit | `workflow-fit` |

The `EVALUATION_SCORE_AREAS` list keeps the ordering stable for UI rendering,
fixtures, and future serialization.

## Fixture Boundary

`packages/ui-workbench/src/evaluation/evaluation-run.fixtures.ts` provides
compile-time and callable fixture helpers for:

- supported tool IDs: Claude Code, Cline, and OpenCode,
- queued/running/passed/failed/inconclusive statuses,
- complete score area labels,
- sample accepted evaluation runs,
- scorecard completeness and average-score range checks.

These fixtures are safe tracked-source examples. They intentionally avoid real
API keys, raw session transcripts, local tool state, and provider account data.

## Next Slice

The next implementation slice should connect Claude Code `stream-json` concepts
to the normalized workbench event model and then record evaluation run metadata
from that normalized stream. Do not store raw Claude Code logs in tracked files.
