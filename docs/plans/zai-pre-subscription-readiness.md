# Z.ai Pre-Subscription Readiness

This checklist defines when `geond-agent` is ready for a meaningful paid Z.ai
GLM Coding Plan evaluation. It does not require a real Z.ai API key, a paid
provider call, or a live Claude Code/Cline/OpenCode run before subscription.

## Companion Docs

- [Z.ai coding tools setup](../guides/zai-coding-tools-setup.md)
- [Z.ai GLM Coding Plan evaluation plan](zai-coding-plan-evaluation.md)
- [Z.ai evaluation task queue](zai-evaluation-task-queue.md)
- [Z.ai evaluation scorecard](zai-evaluation-scorecard.md)
- [Z.ai provider README](../../packages/zai-provider/README.md)
- [Claude Code bridge README](../../packages/claude-code-bridge/README.md)

## Readiness Goal

Before subscribing, the repository should have enough local structure that a
paid evaluation can start immediately and produce useful evidence:

- a normalized workbench event/session snapshot model,
- deterministic fixture replay for sample evaluation sessions,
- backend/model/provider selection metadata,
- Z.ai model catalog and Anthropic-compatible route metadata,
- Claude Code external CLI/ACP adapter capability metadata,
- docs that connect setup, task queue, scorecard, and readiness checks.

## Paid Evaluation State

Updated on 2026-06-21:

- [x] User reports the GLM Coding Plan subscription is active.
- [x] User reports subscription auto-renewal is disabled.
- [x] A repo-local `.env.local` file exists locally, is gitignored, and uses
      mode `0600`.
- [x] `.env` exists locally as a gitignored symlink to `.env.local`, so
      dotenv-style tools can read the same local-only values without
      duplicating the key.
- [x] The local env values provide `ZAI_API_KEY`, the Z.ai Anthropic-compatible
      base URL, and Claude Code default model aliases without exposing the key
      in tracked files.
- [x] The first paid evaluation task has been run and scored with OpenCode;
      see [Z.ai evaluation run: OpenCode Task 1](zai-evaluation-run-opencode-task1.md).
- [x] The second paid evaluation task has been run and scored with Cline;
      see [Z.ai evaluation run: Cline Task 2](zai-evaluation-run-cline-task2.md).
- [x] The third paid evaluation task has been run and scored with OpenCode;
      see [Z.ai evaluation run: OpenCode Task 3](zai-evaluation-run-opencode-task3.md).
- [x] The fourth paid evaluation task has been run and scored with Cline;
      see [Z.ai evaluation run: Cline Task 4](zai-evaluation-run-cline-task4.md).
- [x] The fifth paid evaluation task has been run and scored with OpenCode;
      see [Z.ai evaluation run: OpenCode Task 5](zai-evaluation-run-opencode-task5.md).
- [x] Claude Code live route validation has been run and scored; see
      [Claude Code smoke](zai-evaluation-run-claude-code-smoke.md),
      [Claude Code Task 3](zai-evaluation-run-claude-code-task3.md),
      [Claude Code Task 4](zai-evaluation-run-claude-code-task4.md), and
      [Claude Code session probe](zai-evaluation-run-claude-code-session-probe.md).
- [x] A tool route decision has been recorded; see
      [Z.ai Claude Code route decision](zai-claude-code-route-decision.md).

## Current Code Boundaries

| Boundary | Current file(s) | Ready state |
| --- | --- | --- |
| Workbench events | `packages/ui-workbench/src/workbench/events.ts` | Normalized session lifecycle, assistant text, plan, tool call, command output, diff, approval, warning, and error events exist. |
| Event replay | `packages/ui-workbench/src/workbench/replay.ts` | Same event stream can rebuild the same workbench state without a UI framework. |
| Evaluation fixture | `packages/ui-workbench/src/workbench/fixtures.ts` | Pre-subscription sample stream connects Z.ai route, Claude Code adapter metadata, and Task 1-style evaluation flow. |
| Backend/model selection | `packages/ui-workbench/src/workbench/selection.ts` | Backend adapter, provider route, model profile, routing mode, capability state, UI language, and agent response language are separate fields. |
| Z.ai catalog | `packages/zai-provider/src/catalog.ts` | `glm-4.7`, `glm-5.2`, `glm-5-turbo`, and `auto` model profiles are metadata-only and do not call Z.ai. |
| Z.ai route metadata | `packages/zai-provider/src/catalog.ts` | Anthropic-compatible and OpenAI-compatible coding route metadata exist without provider calls. |
| Z.ai env helper | `packages/zai-provider/src/settings.ts` | API key presence is exposed as a boolean only; empty or whitespace values are treated as missing. |
| Claude Code adapter | `packages/claude-code-bridge/src/capabilities.ts` | External CLI/ACP candidate capabilities are described without bundling or executing Claude Code. |
| Env redaction | `packages/claude-code-bridge/src/redaction.ts` | Secret-like env names are redacted for logs without mutating runtime env. |

## Subscribe Only When These Are True

- [x] Workspace installs and verifies with the current pnpm scripts.
- [x] Workbench event/session snapshot boundary exists.
- [x] Fixture replay helper exists for pre-subscription evaluation shape.
- [x] Backend/model/provider selection metadata exists.
- [x] Z.ai model profiles and route metadata exist without provider calls.
- [x] Z.ai key helper exposes only key presence and treats empty strings as
      missing.
- [x] Claude Code adapter capability metadata exists without bundling or
      executing Claude Code.
- [x] Setup, task queue, scorecard, and readiness docs are linked.
- [x] Current Z.ai price, cancellation, refund, and auto-renewal behavior were
      checked against official docs on 2026-06-21; the user reports the
      subscription is now active and auto-renewal is disabled.
- [ ] A focused multi-day evaluation window is available.
- [x] Local-only secrets storage paths are prepared outside git
      (`~/.config/geond-agent/zai.env`, ignored `.env.local`, and ignored
      `.env` symlink).

## Official Check Snapshot

Checked on 2026-06-21 against official Z.ai docs:

- GLM Coding Plan currently starts at 18 USD per month and supports GLM-5.2,
  GLM-5-Turbo, and GLM-4.7 across plans.
- Z.ai documents Lite, Pro, and Max usage tiers, with higher concurrency and
  weekly prompt estimates for higher tiers.
- Subscriptions auto-renew at the end of each billing cycle. Cancellation is
  managed from the Subscription page and should be done at least 3 days before
  the next billing date to avoid renewal.
- Z.ai's refund policy says subscription purchases are confirmed once purchased
  and refunds are not supported, even if the plan is unused or partly unused.
- GLM Coding Plan usage is limited to officially supported tools/products.
- Endpoint choice matters:
  - Claude Code and Goose use `https://api.z.ai/api/anthropic`.
  - Cline/OpenCode-style OpenAI-compatible setup uses
    `https://api.z.ai/api/coding/paas/v4`.

Official references:

- `https://docs.z.ai/devpack/overview`
- `https://docs.z.ai/devpack/usage-policy`
- `https://docs.z.ai/devpack/quick-start`
- `https://docs.z.ai/devpack/tool/others`

## First Five Paid Tasks

The first paid evaluation window should run the existing queue in
`docs/plans/zai-evaluation-task-queue.md`.

| Task | Paid evaluation target | Code boundary used |
| --- | --- | --- |
| Task 1: Invalid UI language persistence | Check whether the tool understands UI language vs. agent response language separation. | `packages/ui-workbench/src/settings/`, `packages/ui-workbench/src/i18n/`, and event replay fixture expectations. |
| Task 2: Z.ai config empty string handling | Confirm provider helpers keep safe defaults and do not expose keys. | `packages/zai-provider/src/settings.ts`, `packages/zai-provider/src/catalog.ts`, `packages/zai-provider/src/anthropic-env.ts`. |
| Task 3: Bridge env redaction coverage | Check whether the tool preserves diagnostics while hiding secret-like env values. | `packages/claude-code-bridge/src/redaction.ts` and adapter metadata. |
| Task 4: Evaluation run model | Add a small code model for task status, verification commands, scorecard fields, and notes. | `packages/ui-workbench/src/workbench/` event/session model and scorecard docs. |
| Task 5: Evaluation workflow wiring | Align docs and code helpers from setup to scorecard. | `docs/guides/zai-coding-tools-setup.md`, evaluation docs, provider helpers, and bridge metadata. |

## Tool Route Matrix

Run at least two routes if possible:

| Route | Why it matters | Current repo posture |
| --- | --- | --- |
| Claude Code | First bridge target and default implementation route. | Live route, task replay, and session/event probe completed. Use this route to pave the adapter/event path first, while reviewing small-task cost. |
| Cline | Alternative IDE-style agent loop and Z.ai provider path. | Setup/evaluation docs cover it as a comparison route. |
| OpenCode | Alternative CLI/workbench route with ACP/provider model patterns. | Defer as the next horizontal-expansion route after the Claude Code path stabilizes. |

The product implementation route is Claude Code-first. Still avoid collapsing
every result into a single provider verdict: separate the Z.ai provider verdict,
the Claude Code tool verdict, and the `geond-agent` workbench verdict. Cline and
OpenCode remain available comparison paths if Claude Code behavior hides whether
a problem comes from the provider, the tool, or the local adapter.

## Verification Before First Paid Run

Run these commands on the subscription-start branch:

```text
git diff --check
pnpm lint
pnpm test
pnpm build
pnpm verify
```

Also run the repository secret scan pattern used by the controller before
starting any quota-consuming task. The scan must be clean before the first paid
run and again before any commit made during paid evaluation.
