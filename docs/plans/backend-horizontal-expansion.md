# Backend Horizontal Expansion Plan

`geond-agent` should become a local agent workbench that can connect to multiple
coding agent tools, backend protocols, and provider-routing paths. Claude Code is
the first and default implementation route for the next slices, not a single
permanent product dependency.

## Why Avoid Claude Code-Only Coupling

Claude Code is useful as an early bridge candidate because it is a real coding
agent workflow with local repository context, terminal-driven behavior, and
potential ACP/process boundaries.

The workbench should still avoid Claude Code-only coupling because:

- tool capabilities, pricing, quotas, and product terms can change,
- Z.ai performance may vary by client tool,
- some users may prefer IDE/plugin workflows over external CLI workflows,
- ACP-compatible backends may expose cleaner lifecycle events over time,
- the UI should own workbench concepts, not one backend's internal state model.

The durable product surface is the local workbench: sessions, plans, tool calls,
terminal output, diffs, approvals, model-routing metadata, and review history.
Adapters should translate backend behavior into that surface.

## Adapter Expansion Strategy

### Backend Adapter SDK

`packages/backend-adapter-sdk` is the monorepo-local source of truth for
adapter-facing contracts. It owns backend adapter metadata, capability status
helpers, selection catalog helpers, and normalized workbench event types. This
keeps concrete adapters from depending on `packages/ui-workbench` while still
letting the UI render a stable contract.

The SDK is not a protocol implementation and does not absorb
`geond-agent-protocol`. It is the local workbench authoring contract that a
Claude Code adapter, a future OpenCode/Cline adapter, a local-model adapter, or
an IDE/plugin-mediated adapter can share before any optional protocol
export/import step.

Future adapter authoring path:

1. export SDK-shaped `BackendAdapterMetadata`,
2. report capability states without pretending unsupported features exist,
3. emit SDK-shaped `WorkbenchEvent` streams,
4. keep process IO, credentials, raw logs, and tool-private state inside the
   adapter package or ignored local runtime,
5. add protocol/export mapping only after the local event boundary is stable.

### ACP-Compatible Backend

Use when a backend exposes ACP or a similar documented protocol.

Strategy:

- map protocol sessions into workbench sessions,
- normalize tool-call and approval events,
- capture terminal and diff events when the protocol supports them,
- keep protocol-specific state inside the adapter package.

### External CLI/Process Backend

Use when a tool is installed locally and controlled through documented process,
stdio, socket, or command-line behavior.

Strategy:

- treat the tool as a user-installed dependency,
- never bundle proprietary binaries,
- redact secret-like environment values from logs,
- model process lifecycle separately from workbench session state.

### IDE/Plugin Mediated Backend

Use when an IDE extension or plugin is the natural integration point.

Strategy:

- keep plugin credentials and local session state outside this repository,
- document setup rather than committing tool-specific private config,
- translate plugin events into the same workbench concepts where possible,
- avoid making the desktop UI depend on one IDE.

### Provider/Model Routing Backend

Use when the integration concern is endpoint/model selection rather than agent
tool execution.

Strategy:

- keep API keys and subscription state out of source control,
- expose routing metadata and key-presence checks without returning key values,
- allow multiple agent tools to use the same provider routing policy,
- score provider value separately from tool workflow fit.

Provider/model routing backends cooperate with backend adapters through metadata
instead of ownership. A backend adapter owns the running session and tool
execution, while a provider route can supply endpoint kind, model profiles,
manual/auto routing policy, quota/cost metadata, and credential-presence status.
The session should record both selections as a snapshot.

## Provider and Agent Tool Evaluation

Evaluate provider quality and agent tool workflow separately.

For Z.ai GLM Coding Plan:

- Claude Code may be the first bridge route,
- Cline should be checked as an IDE/plugin-style route,
- OpenCode should be checked as an alternate CLI/workbench-style route,
- provider routing helpers should stay reusable across these paths.

If Claude Code underperforms, that is not enough to reject Z.ai. A weak result
could come from the client tool, adapter maturity, setup friction, or model
routing. Run at least one alternate path before deciding whether the provider is
worth keeping.

## Adapter-Neutral UI and State Principles

- The UI renders normalized workbench concepts, not backend-private objects.
- Session state should include adapter identity and capability metadata.
- Unsupported actions should degrade gracefully rather than disappearing into
  tool-specific branches.
- Prompt/model language settings stay separate from UI localization.
- Provider credentials, API keys, user session state, and local tool settings
  stay outside tracked files.
- `geond-agent-protocol` remains a separate repository and is not absorbed into
  this monorepo.

## Initial Path

Start with `packages/claude-code-bridge` because it gives the project a concrete
adapter prototype and the deepest evidence for session/resume, event streams,
permissions, model aliases, and usage metadata. Keep `apps/desktop` and
`packages/ui-workbench` adapter-neutral while the first bridge is built, and keep
the bridge pointed at `packages/backend-adapter-sdk` for shared contracts.

The first adapter capability model now lives in
`packages/backend-adapter-sdk`. It describes what the UI can expect instead of
forcing all backends to pretend they support the same features. New adapter
examples should start from `examples/adapters/mock-backend/` before adding
runtime code.

`packages/codex-cli-bridge` is the first metadata-only second adapter consumer
of the SDK. It does not launch Codex or copy Codex source; it proves that
backend metadata, capability status, execution policy ids, and artifact
references can be described outside the Claude Code bridge before a real runner
exists. `apps/desktop` can list it in the backend picker as a non-executable
candidate so the UI path exercises multi-backend selection without pretending a
Codex runner exists.

`packages/opencode-bridge` is the next metadata-only consumer. It records the
OpenCode-specific questions that matter before a real runner exists: selected
provider/model/mode metadata, host-mediated authentication, permission diff
prompt correlation, and execution-policy mapping. It does not launch OpenCode
or copy OpenCode source.

OpenCode is still deferred as a full runtime path until the Claude Code live
loop is stable. The metadata-only package is a contract pressure test, not a
parallel implementation effort.

## Adapter Capability Matrix Draft

| Capability | ACP-compatible backend | External CLI/process backend | IDE/plugin mediated backend | Provider/model routing backend |
| --- | --- | --- | --- | --- |
| Sessions | Expected through protocol lifecycle. | Adapter maps process/workspace state into sessions. | Depends on plugin event access. | Not an agent session owner. |
| Resume/fork | Possible when protocol supports it. | Tool-specific and may be partial. | Depends on plugin/tool storage. | Not applicable except route metadata. |
| Tool calls | Expected as normalized events. | Parsed from process output or documented streams. | Depends on plugin APIs/events. | Not applicable. |
| Terminal output | Supported when exposed by backend. | Primary event source for many CLI tools. | Depends on IDE terminal integration. | Not applicable. |
| Diff events | Supported when protocol emits file changes. | Derived from filesystem/git checks. | Depends on IDE/editor APIs. | Not applicable. |
| Approvals | Protocol-native or adapter-mediated. | Adapter prompts before risky commands/actions. | Plugin-mediated approval UX. | Provider selection approval only. |
| Model routing | Backend may report selected model. | Env/config driven, adapter reports metadata. | Tool/plugin settings driven. | Primary responsibility. |
| Usage/quota reporting | Depends on backend telemetry. | Depends on CLI/provider output. | Depends on plugin/provider visibility. | Best place for provider-level metadata when available. |
| Model picker support | May expose supported models through protocol metadata. | Adapter may expose models accepted by CLI flags/env. | Plugin UI/settings may expose model choices. | Primary source for model catalog and provider route choices. |
| Auto routing support | Possible when backend can route or accept auto mode. | Possible if adapter can choose env/flags before launch. | Depends on plugin/provider support. | Primary home for task, cost, availability, and reliability policy. |
| BYOK/BYOM support | Depends on protocol/provider configuration. | Common through local env or ignored config. | Depends on plugin policy and local settings. | Primary place to describe external provider/local model routes. |
| Quota/cost reporting | Depends on backend telemetry. | Depends on CLI/provider output. | Depends on plugin/provider visibility. | Primary place for provider-level usage metadata when available. |

Execution policy is modeled as adapter-neutral SDK metadata before it is mapped
to tool-specific permission names. The initial common policy ids are `plan`,
`ask-first`, `accept-edits`, and `bypass`; concrete adapters translate those ids
to their own CLI flags or protocol fields. Normal UI defaults should not expose
`bypass`.

## Open Questions

- What is the smallest shared adapter capability type needed by the UI?
- Which backend events should be required before a session can be considered
  reviewable?
- How much process output parsing is acceptable before a CLI adapter becomes too
  brittle?
- Which evaluation tasks best distinguish provider weakness from tool weakness?
- Which metadata should be required before a backend/model picker choice is
  safe to show as available?
- Which SDK contracts should eventually be published as a standalone package,
  and whether any files should use a different license when external adapter
  authorship becomes a real distribution goal?
