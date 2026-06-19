# geond-agent

Local agent workbench for coding agents, sessions, diffs, and tool orchestration.

`geond-agent` is a desktop-first monorepo for experimenting with a Codex-like
agent workbench built around Goose, Claude Code ACP, and Z.ai GLM Coding Plan.

## Goals

- Build a polished native chat and workbench UI on top of Goose.
- Keep Claude Code ACP bridge logic isolated from the desktop shell.
- Support Z.ai GLM model routing for cost-effective long-running coding loops.
- Add first-class UX for plans, tool calls, terminal output, diffs, approvals,
  session history, and multi-agent workflows.
- Keep `geond-agent-protocol` as a separate repository.

## Monorepo Layout

```text
apps/
  desktop/              Native desktop app and Goose UI integration.
packages/
  claude-code-bridge/   Claude Code ACP bridge, session mapping, resume hooks.
  zai-provider/         Z.ai GLM Coding Plan provider and model routing helpers.
  ui-workbench/         Shared Codex-like workbench UI components.
docs/
  adr/                  Architecture decision records.
```

## Initial Direction

The first usable slice should prove this loop:

1. Launch a Goose-backed desktop session.
2. Route the session through Claude Code ACP.
3. Use Z.ai GLM model mapping for `glm-4.7` and `glm-5.2`.
4. Render tool calls, terminal activity, and file changes as reviewable UI state.

## Related Repositories

- `geond-agent-protocol`: separate orchestration and protocol experiments.
