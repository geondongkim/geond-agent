# Setup Guide

This repository is currently a scaffold. The steps below describe the intended
local development and integration shape.

## Requirements

- macOS, Linux, or Windows development environment.
- Node.js and pnpm.
- Git.
- Optional: Goose Desktop/CLI.
- Optional: Claude Code CLI.
- Optional: `claude-agent-acp`.
- Optional: Z.ai GLM Coding Plan API key.

## Install Dependencies

```bash
pnpm install
```

## Environment

Copy `.env.example` to a local, ignored file such as `.env.local`, or export the
variables in your shell profile.

Do not commit real API keys.

## Z.ai / Claude Code Routing Shape

The intended model mapping for cost-effective coding loops is:

```text
haiku  -> glm-4.7
sonnet -> glm-4.7
opus   -> glm-5.2
```

The intended Anthropic-compatible endpoint is:

```text
https://api.z.ai/api/anthropic
```

Use provider docs and current terms before relying on any paid subscription or
third-party API behavior.
