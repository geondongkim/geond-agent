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
on one agent implementation. Claude Code is the default implementation route for
the next slices, but not the shape of the whole system.

## Packages

### `apps/desktop`

The native desktop app shell. This app should own windowing, navigation,
session layout, and integration with the local operating system.

The first desktop shell is Tauri v2 with a React + Vite + TypeScript renderer.
Tauri commands own local process execution, filesystem access, and native OS
integration. The renderer should stay a workbench client over typed commands and
shared package contracts, not a place where backend adapters are implemented.

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

Claude Code is currently the default implementation route because it provides
the deepest useful surface for session/resume behavior, `stream-json` events,
permission policy, model alias routing, and usage metadata. OpenCode horizontal
expansion is intentionally deferred until this first path is stable.

The bridge normalizes Claude Code `--bare -p --verbose --output-format
stream-json` output through sanitized envelope fixtures, not raw local logs. The
normalizer maps `system/init`, `stream_event`, `assistant`, `user`, and `result`
records into adapter-neutral `WorkbenchEvent` streams, including assistant text
deltas, tool calls/results, run completion, and usage metadata.

Claude Code permission handling is staged. The first live-backed approval shape
maps observed `result.permission_denials` records into local pending
`approval.requested` events for review. Approved local decisions can now trigger
a print-mode follow-up run against the stored external Claude session using
`--resume <externalSessionId>` and a scoped prompt. This is a new process run,
not stdin forwarding into an active process, and any permission-mode override is
one-run only. Interactive forwarding back into a running Claude Code process
remains deferred until a stable approval boundary is confirmed. Normal
persisted UI defaults expose `plan`, `default`, and `acceptEdits`;
`bypassPermissions` is reserved for isolated evaluation runs and is not a normal
settings option.

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

The first implementation uses a neutral workbench selection catalog as the
single source of truth for picker labels and capability metadata. Concrete
packages can expose catalog-shaped entries, such as the Claude Code backend
adapter entry and Z.ai provider route/model entries, but the desktop app
composes them through its own catalog boundary. The same catalog lookup behavior
is used by settings picker options, live-run selection snapshots, and Claude
Code stream-json selection normalization.

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

State ownership is local-first and event-driven. `geond-agent` owns normalized
`WorkbenchEvent` streams, reducers/projections derive visible state, and React
renders the derived state. `geond-agent-protocol` is a later optional
evidence/export target, not the live UI state owner.

The workbench reducer owns the visible state:

- current session and selection snapshot,
- metadata-only context attachments,
- chat timeline,
- plan/checklist state,
- tool call and terminal output state,
- diff review state,
- pending approval queue,
- usage/quota/cost metadata,
- recovery/error notices.

For desktop persistence, the normalized event stream remains the source of
truth, but the app also maintains a durable session index. The index stores
compact session-list metadata such as title, lifecycle, workspace path,
backend label, pending approval count, warning/error counts, external adapter
session links, and updated time. Startup can render the session rail from this
index and load only the active session's detailed event stream. Selecting a
different session lazy-loads that session's events and replays only that active
session.

This boundary keeps Codex-level UX quality measurable. A UI feature should have
fixture replay tests, layout snapshots, keyboard/pointer flow coverage,
English/Korean label coverage, and explicit failure states before it is treated
as complete. The detailed bar lives in
`docs/plans/workbench-ux-quality-bar.md`.

## Context Attachment Boundary

Context imported from a desktop workspace, IDE extension, plugin surface, or
backend adapter enters the workbench through normalized `context.attached`
events. These events store attachment metadata such as kind, title, path,
optional file range, language, summary, provenance, and content state. They do
not store raw private file contents by default.

The first desktop slice can attach the selected workspace path from the command
menu or composer context strip as `metadata-only` context and render it in the
Files inspector. Future IDE surfaces can use the same event shape for
current-file and selected-text references, but must keep editor credentials, raw
selections, private buffers, and plugin session state outside portable
workbench events unless the user explicitly exports sanitized evidence.

Metadata-only persistence does not mean metadata-only backend prompts are
invisible to the user. When the user dispatches a run, selected context
metadata such as paths, summaries, ranges, and diff statistics may be appended
to the backend/provider prompt so the agent can act on the selected evidence.
The UI must disclose that provider-facing prompt boundary separately from the
local persistence boundary, and raw private file contents must remain outside
the prompt unless a future explicit export/attach flow asks for user approval.

## Session Continuity Boundary

Session continuity is adapter-neutral. The workbench owns the local `sessionId`
and the persisted `WorkbenchEvent` stream. A backend adapter may own a separate
external conversation id, such as a Claude Code `session_id`, but that value is
linked through `session.adapter.linked` rather than replacing the workbench
session id.

For Claude Code, fresh runs can use `--session-id <workbenchSessionId>`, while
resume runs use `--resume <externalSessionId>`. The Tauri stream channel remains
the local workbench session id in both cases, so live stdout/stderr and
normalized events replay into the same session snapshot.

This keeps future resume/fork behavior portable across ACP-compatible backends,
external CLI/process backends, IDE/plugin mediated backends, and provider/model
routing backends. See `docs/plans/session-resume-continuity.md`.

## Local Settings Boundary

Desktop storage is a shell concern. Shared packages define typed settings
contracts and storage interfaces, while `apps/desktop` later decides whether
those settings live in app data, platform preferences, or another local-only
store. API keys, tokens, and session-private provider state are not part of the
UI settings contract.

For the first desktop implementation, Tauri app data JSON stores small
non-secret preferences such as UI language, agent response language, default
backend, default provider route, default model alias, and layout preference.
SQLite stores local sessions, workbench events, session snapshots, approvals,
context attachments, tool calls, command output summaries, diff summaries,
usage metadata, and redacted run attempt summaries when available.

The desktop shell now exposes Tauri commands for app-data JSON preferences and a
SQLite-backed normalized event store. The native event store uses
`PRAGMA user_version` migrations and transactionally appends workbench events
with derived updates. Approval requests and resolutions are materialized into a
queryable `workbench_approvals` table so pending approval counts come from
approval rows rather than hand-maintained JSON-only session summaries. The v3
persistence slice also materializes context attachments, tool calls, command
output previews, diff summaries, usage metadata, and run attempt summaries into
queryable tables derived from the normalized event stream. Run attempt rows
capture redacted execution evidence such as runner mode, backend/model
selection, prompt summary, command preview, external session id, normalized
event counts, parse warning count, exit code, and final status, but never raw
Claude logs or provider secrets. The desktop shell exposes those materialized
views through Tauri query commands, and the renderer consumes them through a
typed `createDesktopMaterializedEventStore` boundary so inspector panes do not
need to replay the full event stream for every lookup. The active inspector read
model refreshes the selected session from SQLite materialized views and falls
back to replay-derived projection data in renderer-only development. During
renderer-only Vite development, `apps/desktop` keeps a browser `localStorage`
fallback so the same settings UI can prove save/reload behavior outside the
native shell. Both paths are limited to non-secret preference keys and
normalized workbench events; provider secrets, raw Claude logs, account state,
and private local session files stay out of this persistence contract.

Claude Code execution is also a Tauri command boundary. The shell may read a
workspace-local `.env.local` file and pass only allowlisted Claude/Z.ai routing
variables to the child process. This makes the native runner usable after a
local provider setup while keeping API key values, raw provider account state,
and raw Claude output out of renderer settings and SQLite persistence.

## Command and Preference UX Boundary

The desktop workbench has a command-menu surface for common actions such as
starting the selected runner, choosing a workspace, opening inspector tabs, and
toggling side panels. This is a product pattern borrowed from IDE/plugin
mediated agent surfaces, but it remains local to the desktop shell until a
future IDE adapter exists.

User interaction preferences are explicit local settings. Follow-up behavior,
composer Enter behavior, and review delivery are separate from backend/model
selection and language settings. The initial implementation records these
preferences as non-secret session defaults:

- follow-up policy: `queue`, `steer`, or `interrupt`,
- composer Enter behavior: modifier-Enter send or Enter-to-send,
- review delivery: inline thread review or a future detached review session.

Only the safe local preference values are persisted. The command menu does not
persist selected files, private editor selections, raw transcripts, or IDE
session state. Future file/selection-to-thread features should enter the
workbench through normalized context events with provenance, not through hidden
backend state.

Do not persist API key values, tokens, provider account state, raw Claude Code
logs by default, raw private transcripts, or local user session files in tracked
source or portable app exports.

`geond-agent-protocol` remains a separate optional integration target for shared
evidence, reservations, handoffs, and review context. The strategy lives in
`docs/plans/geond-agent-protocol-integration-strategy.md`.
