# Backend Horizontal Expansion Plan

`geond-agent` should become a local agent workbench that can connect to multiple
coding agent tools, backend protocols, and provider-routing paths. Claude Code is
the first adapter target, not a single permanent dependency.

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
adapter prototype. Keep `apps/desktop` and `packages/ui-workbench`
adapter-neutral while the first bridge is built.

As soon as the first Claude Code slice can report useful backend metadata, add a
small adapter capability model before adding the second adapter. That capability
model should describe what the UI can expect instead of forcing all backends to
pretend they support the same features.

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

## Open Questions

- What is the smallest shared adapter capability type needed by the UI?
- Which backend events should be required before a session can be considered
  reviewable?
- How much process output parsing is acceptable before a CLI adapter becomes too
  brittle?
- Which evaluation tasks best distinguish provider weakness from tool weakness?
