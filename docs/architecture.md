# Architecture

`geond-agent` is structured as a monorepo with separate ownership boundaries for
desktop UI, backend bridges, provider routing, and shared UI components.

## High-Level Flow

```text
User
  -> apps/desktop
  -> packages/ui-workbench
  -> packages/claude-code-bridge
  -> ACP-compatible agent backend
  -> packages/zai-provider
  -> model provider endpoint
```

## Packages

### `apps/desktop`

The native desktop app shell. This app should own windowing, navigation,
session layout, and integration with the local operating system.

### `packages/ui-workbench`

Shared UI components for the agent workbench:

- session sidebar,
- chat timeline,
- tool-call cards,
- plan/checklist panel,
- diff review panel,
- terminal output panel,
- approval prompts.

### `packages/claude-code-bridge`

Bridge package for Claude Code and ACP-related behavior:

- process execution,
- ACP session lifecycle,
- session ID mapping,
- list/resume/fork experiments,
- permission forwarding,
- terminal/tool event normalization.

This package must not copy proprietary Claude Code internals.

### `packages/zai-provider`

Provider package for Z.ai GLM Coding Plan routing:

- endpoint configuration,
- model aliases,
- safe subscription-plan defaults,
- environment variable helpers,
- docs for direct and Anthropic-compatible usage.

This package must not store provider keys.

## Integration Boundaries

Third-party applications should be treated as external processes, protocols, or
documented APIs unless their licenses explicitly allow vendoring or forking.

When integrating with Goose, ACP, Cline, Kilo Code, OpenHands, or OpenCode,
preserve their license and attribution requirements if any code is copied.

When integrating with Claude Code, keep the boundary at CLI/process/protocol
level unless Anthropic publishes code or terms that permit deeper integration.
