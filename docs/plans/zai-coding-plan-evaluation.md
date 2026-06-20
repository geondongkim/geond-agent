# Z.ai GLM Coding Plan Evaluation Plan

## Purpose

Decide when to subscribe to Z.ai GLM Coding Plan and how to evaluate whether it
is useful enough for `geond-agent` development workflows.

The main question is not only whether GLM models are strong, but whether the
actual coding-agent loop through tools such as Claude Code, Cline, or OpenCode
is productive enough compared with Codex-style workflows.

## Current Recommendation

Do not start with an annual subscription.

Prefer this sequence:

1. Prepare the repo and integration boundaries first.
2. Queue concrete evaluation tasks.
3. Start the subscription on the first day of a focused evaluation window.
4. Begin with Pro monthly or Pro quarterly.
5. Disable auto-renewal immediately after payment.

The best subscription start date is not "as soon as possible." It is the first
day when the project has enough real work ready to test the tool seriously.

## Why Not Subscribe Immediately

`geond-agent` is still in an early scaffold and boundary-design phase. At this
stage, there may not be enough real implementation work to justify consuming a
paid subscription window.

Before subscribing, finish enough local structure so that Z.ai can be tested on
meaningful work:

- mock/provider boundaries,
- Claude Code bridge boundary,
- Cline/OpenCode setup notes,
- UI language/settings boundary,
- basic pnpm/typecheck verification flow,
- a queue of real repo tasks.

## Evaluation Kit

Use these companion docs before starting a paid evaluation:

- [Z.ai coding tools setup](../guides/zai-coding-tools-setup.md)
- [Z.ai pre-subscription readiness](zai-pre-subscription-readiness.md)
- [Backend horizontal expansion](backend-horizontal-expansion.md)
- [Model and backend selection roadmap](model-and-backend-selection-roadmap.md)
- [Z.ai evaluation task queue](zai-evaluation-task-queue.md)
- [Z.ai evaluation scorecard](zai-evaluation-scorecard.md)
- [Z.ai provider README](../../packages/zai-provider/README.md)
- [Claude Code bridge README](../../packages/claude-code-bridge/README.md)

## Subscription Timing Criteria

Subscribe only when all of these are true:

- Claude Code or Cline/OpenCode can be connected quickly.
- There is time to test for several focused days.
- At least five concrete tasks are queued.
- Success and failure criteria are written down before testing.
- Current Z.ai pricing, cancellation, and refund policy have been checked again.
- Auto-renewal cancellation path is known.

## Pre-Subscription Checklist

Do not subscribe until each item is complete:

- [ ] Current branch installs and verifies with `pnpm install`, then
      `git diff --check`, `pnpm lint`, `pnpm test`, and `pnpm build` (or one
      `pnpm verify`).
- [ ] Claude Code, Cline, and OpenCode setup paths are documented without
      committing secrets.
- [ ] Local-only environment variable names are understood:
      `ZAI_API_KEY`, `ANTHROPIC_BASE_URL`,
      `ANTHROPIC_DEFAULT_HAIKU_MODEL`,
      `ANTHROPIC_DEFAULT_SONNET_MODEL`, and
      `ANTHROPIC_DEFAULT_OPUS_MODEL`.
- [ ] Real API keys will live only in shell env, keychain, ignored `.env.local`,
      or ignored tool-specific local settings.
- [ ] The five evaluation tasks are queued in
      `zai-evaluation-task-queue.md`.
- [ ] The scorecard is ready before the first paid run.
- [ ] The readiness checklist in
      `zai-pre-subscription-readiness.md` is green except for live commercial
      checks and local-only secret setup.
- [ ] Workbench event replay, Z.ai model catalog, and Claude Code adapter
      capability metadata are present so paid tool runs can be compared against
      the same boundary model.
- [ ] Current Z.ai price, cancellation, refund, and auto-renewal behavior have
      been checked outside this repository.
- [ ] The evaluator has a focused multi-day window to run and review tasks.

## Evaluation Task Queue

Use real repo work, not toy prompts. The current task queue lives in
[zai-evaluation-task-queue.md](zai-evaluation-task-queue.md).

### Capability Checks

For each task, check whether the tool can:

- understand the repo structure,
- make focused changes without broad refactors,
- follow existing code style,
- read and act on test/typecheck errors,
- recover after a failed command,
- explain changed files clearly,
- avoid committing secrets or local session state.

## Suggested Benchmark Repos

Use at least two different project shapes:

- `geond-agent`: new product scaffolding, package boundaries, docs, TypeScript.
- `geond-agent-protocol`: existing repo with stricter boundaries and more
  mature workflow expectations.

Optionally add one heavier real-world repo once the first two are stable.

## Tool Matrix

Evaluate Z.ai through more than one supported tool if possible.

| Tool | Purpose | Result |
| --- | --- | --- |
| Claude Code | Default implementation route and primary ACP/CLI bridge candidate | Live smoke, task replay, and session/event probe completed |
| Cline | Alternative agent loop and IDE-style workflow | Useful comparison route, but noisier |
| OpenCode | Alternative CLI/workbench loop | Strong comparison route; defer horizontal expansion until Claude Code path stabilizes |

The next implementation sequence is Claude Code-first. This does not make the
evaluation a single-tool provider verdict. If Claude Code underperforms, do not
stop the Z.ai evaluation immediately. Check Cline, OpenCode, or another
supported path before deciding whether Z.ai itself is a poor fit.

Separate these verdicts:

- provider verdict: whether Z.ai GLM Coding Plan is useful and cost-effective,
- tool verdict: whether a specific client such as Claude Code, Cline, or
  OpenCode fits the workflow,
- workbench verdict: whether `geond-agent` adapter boundaries need adjustment.

This separation matches the horizontal backend direction in
[backend-horizontal-expansion.md](backend-horizontal-expansion.md).

## Scoring Rubric

Score each task from 1 to 5. Use the detailed template in
[zai-evaluation-scorecard.md](zai-evaluation-scorecard.md).

| Area | What To Measure |
| --- | --- |
| Repo understanding | Finds the right files and boundaries quickly. |
| Edit quality | Produces small, relevant, reviewable changes. |
| Verification | Runs or suggests the right checks. |
| Recovery | Handles errors without spiraling into unrelated edits. |
| Cost/value | Saves enough time to justify the subscription. |
| Workflow fit | Feels usable for daily development. |

## Decision Threshold

Continue beyond the first evaluation period only if:

- average score is 4 or higher,
- at least one non-trivial feature slice lands cleanly,
- tool failures are understandable and recoverable,
- the workflow feels at least 70-80% as useful as Codex for local repo work.

If scores are mixed, stay monthly.

Move to quarterly only when the tool is useful in normal work, not only in demos.

Move to annual only after repeated weekly use proves that it is part of the
daily workflow.

## Suggested First Evaluation Window

Day 0:

- Check current price and refund/cancellation terms.
- Subscribe to Pro monthly or Pro quarterly.
- Disable auto-renewal.
- Set up Claude Code and at least one alternative tool.

Days 1-3:

- Run the three small bug-fix tasks.
- Record failures and friction.

Days 4-5:

- Run the feature slice.
- Run the long docs/code task.

Day 6:

- Compare outputs with Codex expectations.
- Decide whether to keep using, downgrade, or stop after the paid period.

## Practical Default

If there is no focused evaluation time this week, do not subscribe yet.

If there is a focused evaluation window and the cost is acceptable, use Pro
monthly first. Choose Pro quarterly only if the three-month cost is acceptable
as an evaluation budget even if Claude Code does not match Codex performance.

Annual should wait until the workflow has already proven itself.
