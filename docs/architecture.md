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

The workbench owns UI localization boundaries. The initial supported UI
languages are English (`en`) and Korean (`ko`). The UI language is selected from
local app settings, defaults to the detected system language, and falls back to
English when detection fails.

UI language and agent response language are intentionally separate settings. A
user may run the workbench UI in Korean while asking agent prompts or model
responses to stay in English, or vice versa. Provider packages should receive
explicit agent-language preferences instead of inferring them from UI strings.

The first implementation exposes a framework-neutral workbench runtime that can
load, update, and persist language settings through a local settings store
interface.

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

Model routing helpers may expose whether an API key is present, but must not
return or persist the key value.

## Integration Boundaries

Third-party applications should be treated as external processes, protocols, or
documented APIs unless their licenses explicitly allow vendoring or forking.

When integrating with Goose, ACP, Cline, Kilo Code, OpenHands, or OpenCode,
preserve their license and attribution requirements if any code is copied.

When integrating with Claude Code, keep the boundary at CLI/process/protocol
level unless Anthropic publishes code or terms that permit deeper integration.

## Local Settings Boundary

Desktop storage is a shell concern. Shared packages define typed settings
contracts and storage interfaces, while `apps/desktop` later decides whether
those settings live in app data, platform preferences, or another local-only
store. API keys, tokens, and session-private provider state are not part of the
UI settings contract.
