# Z.ai Pre-Subscription Readiness

This checklist defines when `geond-agent` is ready for a meaningful paid Z.ai
GLM Coding Plan evaluation. It does not require a real Z.ai API key, a paid
provider call, or a live Claude Code/Cline/OpenCode run before subscription.

## Readiness Goal

Before subscribing, the repository should have enough local structure that a
paid evaluation can start immediately and produce useful evidence:

- a normalized workbench event/session snapshot model,
- deterministic fixture replay for sample evaluation sessions,
- backend/model/provider selection metadata,
- Z.ai model catalog and Anthropic-compatible route metadata,
- Claude Code external CLI/ACP adapter capability metadata,
- docs that connect setup, task queue, scorecard, and readiness checks.

## Current Code Boundaries

| Boundary | Current file(s) | Ready state |
| --- | --- | --- |
| Workbench events | `packages/ui-workbench/src/workbench/events.ts` | Normalized session lifecycle, assistant text, plan, tool call, command output, diff, approval, warning, and error events exist. |
| Event replay | `packages/ui-workbench/src/workbench/replay.ts` | Same event stream can rebuild the same workbench state without a UI framework. |
| Evaluation fixture | `packages/ui-workbench/src/workbench/fixtures.ts` | Pre-subscription sample stream connects Z.ai route, Claude Code adapter metadata, and Task 1-style evaluation flow. |
| Backend/model selection | `packages/ui-workbench/src/workbench/selection.ts` | Backend adapter, provider route, model profile, routing mode, capability state, UI language, and agent response language are separate fields. |
| Z.ai catalog | `packages/zai-provider/src/catalog.ts` | `glm-4.7`, `glm-5.2`, `glm-5-turbo`, and `auto` model profiles are metadata-only and do not call Z.ai. |
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
- [ ] Current Z.ai price, cancellation, refund, and auto-renewal behavior have
      been checked outside the repository immediately before payment.
- [ ] A focused multi-day evaluation window is available.
- [ ] Local-only secrets storage path is prepared outside git, such as shell
      env, keychain, ignored `.env.local`, or ignored tool-specific settings.

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
| Claude Code | First bridge target and likely ACP/external CLI path. | Adapter metadata exists; execution is deferred until the user-installed tool is available. |
| Cline | Alternative IDE-style agent loop and Z.ai provider path. | Setup/evaluation docs cover it as a comparison route. |
| OpenCode | Alternative CLI/workbench route with ACP/provider model patterns. | Setup/evaluation docs cover it as a comparison route. |

Do not make a single-tool verdict. If Claude Code underperforms, keep the Z.ai
provider evaluation alive long enough to test Cline or OpenCode. Separate the
provider verdict from the tool verdict and the `geond-agent` workbench verdict.

## Verification Before Payment

Run these commands on the subscription-start branch:

```text
git diff --check
pnpm lint
pnpm test
pnpm build
pnpm verify
```

Also run the repository secret scan pattern used by the controller before
entering any real API key locally. The scan must be clean before payment and
again before any commit made during paid evaluation.

