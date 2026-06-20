# Architecture

`geond-agent` is structured as a monorepo with separate ownership boundaries for
desktop UI, backend bridges, provider routing, and shared UI components.

## High-Level Flow

```text
User
  -> apps/desktop
  -> packages/ui-workbench
  -> backend adapter boundary
     -> ACP-compatible backend
     -> external CLI/process backend
     -> IDE/plugin mediated backend
     -> provider/model routing backend
  -> external agent tool or model provider
```

The workbench UI is adapter-neutral. It should render sessions, plans, tool
calls, terminal output, diffs, approvals, and backend metadata without depending
on one agent implementation. Claude Code is the first bridge target, not the
shape of the whole system.

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

This package is a Claude Code adapter prototype. It does not define the complete
backend abstraction for `geond-agent`; future packages may adapt other ACP
servers, external CLI tools, IDE/plugin surfaces, or provider-routing flows.

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

## Backend Adapter Boundary

The backend adapter layer translates tool-specific behavior into workbench
events and state. It is the boundary that lets `geond-agent` remain a horizontal
local agent workbench rather than a Claude Code-only app.

Adapter categories:

- ACP-compatible backend: communicates through ACP or an ACP-like documented
  protocol and maps sessions, tool calls, permissions, and lifecycle events into
  workbench state.
- External CLI/process backend: launches or communicates with a user-installed
  tool through documented process, stdio, or command-line behavior.
- IDE/plugin mediated backend: receives events or instructions from an IDE
  extension or plugin surface while keeping credentials and local plugin state
  outside the repository.
- Provider/model routing backend: manages endpoint and model routing metadata
  for a provider without owning the agent tool UI or storing provider secrets.

Adapter implementations may have different capabilities. The UI should depend on
capability metadata and normalized events instead of importing tool-specific
state from a concrete adapter package.

The first implementation can prove this boundary with
`packages/claude-code-bridge`, but workbench concepts such as session lists,
resume/fork actions, tool-call cards, terminal output, diff events, approval
prompts, model routing, and usage reporting must remain adapter-neutral.

## OSS Reference Patterns

The design should learn from OSS workbench patterns without importing their
source code. The current reference snapshot is documented in
`docs/research/oss-agent-workbench-reference.md`.

Reference patterns to preserve:

- Goose-style canonical model registry and provider capability metadata, where
  model entries can expose tool support, reasoning or thinking support,
  modalities, context limits, pricing, and release metadata.
- Goose-style session import/export direction, but implemented through
  `geond-agent`'s own adapter-neutral session snapshot shape.
- Cline-style provider/model catalog, model picker flow, GLM
  thinking/reasoning route separation, and host abstraction for workspace,
  terminal, diff, and environment services.
- OpenCode-style session selected provider/model/mode metadata, explicit
  provider/model dialogs, permission diff prompts, and target-specific TUI
  plugin boundaries.
- OpenHands-style LLM profiles, settings/secrets separation, key-present
  metadata, usage/cost/context metrics, and security risk indicators.
- Codex-style protocol/event-driven UI, execution policy boundary, approval
  overlays, and snapshot-tested TUI regressions.

OpenHands `enterprise/` is explicitly excluded as an implementation reference
because it is under a PolyForm license. Other third-party source still requires
license review before copying or vendoring.

## Backend and Model Selection Boundary

Backend selection and model selection are related but separate concerns.

Concepts:

- Backend adapter: owns session and tool execution. Examples include a Claude
  Code adapter, an ACP-compatible backend, an external CLI/process backend, an
  IDE/plugin mediated backend, a future SDK-like embedded backend, or a local
  model backend.
- Provider route: owns endpoint, auth boundary, and provider-specific model
  routing metadata. Examples include a Z.ai Anthropic-compatible route, a local
  OpenAI-compatible route, or a future provider registry entry.
- Model profile: names a concrete model or alias such as `glm-4.7`, `glm-5.2`,
  `auto`, or another provider-specific profile.
- Routing mode: records whether the user selected a model manually or whether
  the workbench selected one automatically.
- Per-session selection snapshot: captures the selected backend adapter,
  provider route, model profile, routing mode, and relevant capability metadata
  at the time a session starts or resumes.

The UI should show backend and model choices from adapter/provider capability
metadata. It should not store provider API keys, tokens, local user session
state, or provider account state. Secret values stay in local shell/keychain or
ignored tool-specific settings managed outside the tracked repository.

These are separate settings:

- UI language,
- agent response language,
- backend selection,
- provider route selection,
- model selection,
- routing mode (`manual` or `auto`).

Manual routing means the user explicitly selects the model profile. Auto routing
means the workbench or adapter selects a model from available profiles using
task complexity, model availability, quota/cost, and reliability metadata.

GitHub Copilot app and Copilot Chat are reference product patterns for this
direction. They do not imply that this repository should add a Copilot SDK
dependency, call GitHub APIs, copy third-party code, or store GitHub/Copilot
credentials.

## Event-Driven Workbench UX Boundary

The UI should be driven by normalized workbench events, not by concrete adapter
internals. Backend adapters emit events such as session configured, turn
started, assistant text delta, plan update, tool call started, command output,
diff emitted, approval requested, approval resolved, warning, error, and turn
completed.

The workbench reducer owns the visible state:

- current session and selection snapshot,
- chat timeline,
- plan/checklist state,
- tool call and terminal output state,
- diff review state,
- pending approval queue,
- usage/quota/cost metadata,
- recovery/error notices.

This boundary keeps Codex-level UX quality measurable. A UI feature should have
fixture replay tests, layout snapshots, keyboard/pointer flow coverage,
English/Korean label coverage, and explicit failure states before it is treated
as complete. The detailed bar lives in
`docs/plans/workbench-ux-quality-bar.md`.

## Local Settings Boundary

Desktop storage is a shell concern. Shared packages define typed settings
contracts and storage interfaces, while `apps/desktop` later decides whether
those settings live in app data, platform preferences, or another local-only
store. API keys, tokens, and session-private provider state are not part of the
UI settings contract.
