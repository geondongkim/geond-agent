# Project Brief

`geond-agent` is a local-first coding agent workbench.

The project aims to combine:

- a native desktop frontend inspired by Goose and Codex-like workflows,
- ACP-based backend routing,
- Claude Code bridge experiments,
- Z.ai GLM Coding Plan model routing,
- first-class UI for plans, tools, terminal output, diffs, and approvals.

## Why This Exists

Current coding agents often split the experience across terminal sessions, IDE
sidebars, desktop apps, provider dashboards, and model-specific settings.

`geond-agent` should become a focused local workbench where those pieces feel
like one coherent workflow.

## Design Principles

- Local-first: user code, local shell, and local state remain first-class.
- Provider-aware: model routing should be explicit and understandable.
- Bridge-first: agent backends are connected through narrow adapters.
- Reviewable: file changes, commands, and tool calls should be easy to inspect.
- Reversible: risky actions should have visible approval and rollback paths.
- License-clean: third-party code and product integrations stay clearly marked.
