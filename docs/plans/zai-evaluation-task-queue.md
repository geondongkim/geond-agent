# Z.ai Evaluation Task Queue

Use this queue after setup is complete and before deciding whether to keep a
Z.ai GLM Coding Plan subscription. Each task should be run in a fresh branch or
clean worktree, with one tool at a time.

Do not use toy prompts. Ask the tool to inspect the repository, make the change,
run verification, and report what changed.

## Companion Docs

This queue is one step in the evaluation flow:

- [Z.ai coding tools setup](../guides/zai-coding-tools-setup.md) covers local
  tool and env setup before any paid run.
- [Z.ai GLM Coding Plan evaluation plan](zai-coding-plan-evaluation.md) defines
  subscription timing and the scoring thresholds.
- [Z.ai evaluation scorecard](zai-evaluation-scorecard.md) records the result of
  each task below.
- [Z.ai pre-subscription readiness](zai-pre-subscription-readiness.md) lists the
  code boundaries each task exercises.

Tasks 2 and 3 exercise the provider and bridge boundary helpers. Their names and
behavior are documented in the package READMEs, not duplicated here:

- [Z.ai provider README](../../packages/zai-provider/README.md) —
  `createZaiProviderConfig`, `createZaiAnthropicCompatibleEnvironment`,
  `getZaiModelProfile`.
- [Claude Code bridge README](../../packages/claude-code-bridge/README.md) —
  `defineClaudeCodeAcpBoundary`, `redactClaudeCodeAcpBoundary`,
  `shouldRedactEnvName`, `createClaudeCodeAdapterMetadata`.

Task 4 uses the evaluation run model in
`packages/ui-workbench/src/evaluation/evaluation-run.ts`; the scorecard maps its
fields one-to-one.

## Task 1: Bug Fix - Invalid UI Language Persistence

Type: small bug fix

Target area:

- `packages/ui-workbench/src/settings/`
- `packages/ui-workbench/src/i18n/`

Prompt shape:

Ask the tool to ensure unsupported UI language values from local settings never
persist back into saved settings. The UI language should normalize to `en` or
`ko`, while `agentResponseLanguage` remains independent.

Success criteria:

- Loading corrupted local settings falls back to a supported UI language.
- Saving after recovery stores only `en` or `ko` for `uiLanguage`.
- Agent response language is not forced to match the UI language.
- `pnpm lint`, `pnpm test`, and `pnpm build` pass.
- No broad refactor of the i18n boundary.

Failure criteria:

- Unsupported UI language values are saved again.
- Agent response language is collapsed into UI language.
- Tool rewrites unrelated package structure.

## Task 2: Bug Fix - Z.ai Config Empty String Handling

Type: small bug fix

Target area:

- `packages/zai-provider/src/settings.ts`
- `packages/zai-provider/src/anthropic-env.ts`
- `packages/zai-provider/README.md`

Prompt shape:

Ask the tool to treat empty or whitespace-only provider environment values as
missing. The default endpoint and model routing should remain stable, and real
API key values must never be returned by helper functions.

Success criteria:

- Empty `ANTHROPIC_BASE_URL` falls back to the default endpoint.
- Empty model alias env vars fall back to default routing.
- `hasApiKey` is false for empty or whitespace-only keys.
- README behavior matches code.
- `pnpm lint`, `pnpm test`, and `pnpm build` pass.

Failure criteria:

- Helpers expose the key value.
- Empty strings overwrite safe defaults.
- The tool adds a real provider call or network dependency.

## Task 3: Bug Fix - Bridge Env Redaction Coverage

Type: small bug fix

Target area:

- `packages/claude-code-bridge/src/redaction.ts`
- `packages/claude-code-bridge/README.md`

Prompt shape:

Ask the tool to harden env redaction for mixed-case secret names and common
provider aliases while preserving non-secret environment values for diagnostics.

Success criteria:

- Secret-like names containing `key`, `token`, `secret`, `auth`, `password`, or
  `session` are redacted case-insensitively.
- Non-secret env values remain visible.
- Undefined env values are preserved without throwing.
- README explains that redaction is for logs and does not mutate runtime env.
- `pnpm lint`, `pnpm test`, and `pnpm build` pass.

Failure criteria:

- Redaction removes all env values and makes diagnostics useless.
- Secret-like values remain visible.
- Runtime bridge config is mutated unexpectedly.

## Task 4: Feature Slice - Evaluation Run Model

Type: new feature slice

Target area:

- `packages/ui-workbench/src/`
- `docs/plans/`

Prompt shape:

Ask the tool to add a small TypeScript model for evaluation runs that can track
tool name, task ID, status, verification commands, scores, and notes. It should
not add a database, UI framework, or provider call.

Success criteria:

- Types support Claude Code, Cline, and OpenCode as evaluation tools.
- Task status can represent queued, running, passed, failed, and inconclusive.
- Score fields match the scorecard categories.
- Docs mention how the model maps to the scorecard.
- `pnpm lint`, `pnpm test`, and `pnpm build` pass.

Failure criteria:

- The feature chooses a desktop framework.
- The feature stores secrets, tokens, or provider account state.
- The feature expands into unrelated session orchestration.

## Task 5: Long Task - Evaluation Workflow Wiring

Type: long docs/code task

Target area:

- `docs/guides/zai-coding-tools-setup.md`
- `docs/plans/zai-coding-plan-evaluation.md`
- `docs/plans/zai-evaluation-scorecard.md`
- `packages/zai-provider/src/`
- `packages/claude-code-bridge/src/`

Prompt shape:

Ask the tool to align the docs and code so the pre-subscription evaluation flow
has one coherent path from setup, to task queue, to scorecard, to provider/bridge
boundary helpers.

Success criteria:

- Docs link to each other without duplicating entire sections.
- Code helper names match the docs.
- Provider and bridge boundaries still avoid actual API calls.
- Verification commands are clearly listed.
- `git diff --check`, `pnpm lint`, `pnpm test`, and `pnpm build` pass.

Failure criteria:

- The tool makes provider network calls.
- The tool commits real local setup files.
- Docs and code diverge on env variable names.
- The change becomes a broad architecture rewrite.

## Recording Rules

For every evaluation task, record:

- tool name,
- model/route used,
- branch or worktree,
- task start and end time,
- commands run,
- verification result,
- final scorecard values,
- whether the result would be accepted in normal project work.
