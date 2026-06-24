# Z.ai Coding Tools Setup Guide

This guide prepares a Z.ai GLM Coding Plan evaluation without starting a paid
subscription or committing any API key.

Use it to make Claude Code, Cline, and OpenCode ready for a focused evaluation
window. Do not paste real secrets into this repository, docs, task notes,
scorecards, screenshots, or committed config files.

## Evaluation Targets

### Claude Code

Purpose:

- primary external CLI and ACP bridge candidate,
- best fit for `packages/claude-code-bridge`,
- first place to test session, diff, and verification workflows.

Boundary:

- treat Claude Code as a user-installed external tool,
- do not bundle the binary,
- do not copy proprietary internals,
- pass only local runtime configuration through shell env or ignored files.

### Cline

Purpose:

- IDE-style agent loop comparison,
- useful for edit review, plan/act workflow, and recovery behavior,
- good fallback if Claude Code is not the best Z.ai path.

Boundary:

- keep Cline workspace settings local-only,
- do not commit extension config that contains provider credentials,
- record results in the scorecard, not in provider-specific private logs.

### OpenCode

Purpose:

- alternative CLI/workbench-style agent loop,
- useful for checking whether Z.ai performance depends on the client tool,
- comparison point for long-running terminal-oriented workflows.

Boundary:

- keep tool config outside the repository or in ignored local files,
- do not vendor OpenCode source or assets,
- document only the local environment variable contract used for evaluation.

## Local Environment Contract

Use these names as the project-level local contract. Map them into each tool
only after checking that tool's current setup docs.

```bash
# Required only after a paid evaluation starts. Never commit a real value.
ZAI_API_KEY=

# Z.ai Anthropic-compatible endpoint used by the evaluation.
ANTHROPIC_BASE_URL=https://api.z.ai/api/anthropic

# Claude Code --bare should receive this through a local-only apiKeyHelper
# settings boundary. geond-agent can derive it from ZAI_API_KEY at launch time,
# so do not duplicate the real value in tracked files.
ANTHROPIC_AUTH_TOKEN=

# Default coding-plan routing for Anthropic-style aliases.
ANTHROPIC_DEFAULT_HAIKU_MODEL=glm-4.7
ANTHROPIC_DEFAULT_SONNET_MODEL=glm-4.7
ANTHROPIC_DEFAULT_OPUS_MODEL=glm-5.2
```

Optional local-only metadata:

```bash
GEOND_AGENT_EVAL_TOOL=claude-code
GEOND_AGENT_EVAL_TASK_ID=bug-1
```

These optional names are for local notes and shell history only. They are not
required by the codebase. For Claude Code direct `--bare` runs, prefer an
ignored local settings file that uses `apiKeyHelper`; for geond-agent desktop
runs, keep `ZAI_API_KEY` in ignored local env and let the native runner create
the process-local Claude settings/helper boundary.

## Local-Only Storage Rules

Allowed:

- shell profile exports on the evaluator's machine,
- OS keychain or password manager,
- ignored `.env.local`,
- ignored tool-specific local settings,
- private evaluation notes outside the repository.

Not allowed:

- committing real API keys or session tokens,
- adding provider account screenshots to the repo,
- saving local Claude Code, Cline, or OpenCode state in tracked files,
- copying third-party application code into this repository,
- logging full request headers or authorization values.

## Pre-Subscription Setup Checklist

- [ ] Confirm `git diff --check`, `pnpm lint`, `pnpm test`, and `pnpm build` pass
      (run `pnpm install` first, then `pnpm verify` to run the whole set).
- [ ] Confirm `.env.local` or shell env is ignored and not staged.
- [ ] Install or update Claude Code locally from the official source.
- [ ] Install or update Cline locally from the official source.
- [ ] Install or update OpenCode locally from the official source.
- [ ] Confirm each tool can open the `geond-agent` workspace without secrets.
- [ ] Confirm where each tool stores local provider settings.
- [ ] Prepare the task queue in `docs/plans/zai-evaluation-task-queue.md`.
- [ ] Prepare the scorecard in `docs/plans/zai-evaluation-scorecard.md`.
- [ ] Re-check current Z.ai pricing, cancellation, refund, and auto-renewal
      behavior outside this repository.

## Evaluation-Day Setup Checklist

- [ ] Start the paid plan only when a focused evaluation window begins.
- [ ] Add the real `ZAI_API_KEY` only to local shell/keychain/ignored config.
- [ ] Disable auto-renewal immediately if that is the intended budget control.
- [ ] Run one queued task at a time.
- [ ] Record the tool, task ID, commands run, failures, and scorecard results.
- [ ] Run the repository verification commands before accepting any result.
- [ ] Run a secret scan before committing evaluation-driven changes.

## Companion Docs and Boundary Helpers

This guide is the entry point of one evaluation flow. Follow these links in
order; each doc owns its own step and does not repeat the others:

- [Z.ai GLM Coding Plan evaluation plan](../plans/zai-coding-plan-evaluation.md)
  ties setup, timing, queue, scorecard, and readiness together.
- [Z.ai evaluation task queue](../plans/zai-evaluation-task-queue.md) holds the
  real repo tasks to run.
- [Z.ai evaluation scorecard](../plans/zai-evaluation-scorecard.md) records the
  result of each task.
- [Z.ai pre-subscription readiness](../plans/zai-pre-subscription-readiness.md)
  lists the code boundaries that must exist before subscribing.

The provider and bridge helper names referenced by Tasks 2 and 3 live with the
code and are documented in each package README. The docs and code use the same
names:

- [Z.ai provider README](../../packages/zai-provider/README.md) documents
  `createZaiProviderConfig`, `createZaiAnthropicCompatibleEnvironment`, and
  `getZaiModelProfile`.
- [Claude Code bridge README](../../packages/claude-code-bridge/README.md)
  documents `defineClaudeCodeAcpBoundary`, `redactClaudeCodeAcpBoundary`,
  `shouldRedactEnvName`, and `createClaudeCodeAdapterMetadata`.

These helpers are pure metadata and redaction helpers. They never make provider
network calls and never return or persist the `ZAI_API_KEY` value.
