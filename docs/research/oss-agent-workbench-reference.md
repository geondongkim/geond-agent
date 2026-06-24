# OSS Agent Workbench Reference

This research note records design patterns observed from local clones of
open-source agent workbench and code-agent projects. It is reference material
only. `geond-agent` must not copy source code from these repositories without a
separate license review and attribution update.

## Investigation Snapshot

| Project | Repository | Investigated commit | License notes |
| --- | --- | --- | --- |
| Goose | `block/goose` | `6c2ec55` (`6c2ec554de1632636d484e4124fbb3c011105342`) | Apache-2.0 |
| Cline | `cline/cline` | `ee59f81` (`ee59f81706981e0a64c8b32f8f0415c9d39561fa`) | Apache-2.0 |
| OpenCode | `sst/opencode` | `009f379` (`009f3799cd6d28cad5a3e1b3902a80f60f93122e`) | MIT |
| OpenHands | `All-Hands-AI/OpenHands` | `7b228db` (`7b228db6ae143598b4caf65c6f7ed759b511f922`) | MIT outside `enterprise/`; `enterprise/` is PolyForm Free Trial and is excluded from design reuse |
| Codex | `openai/codex` | `98845e4` (`98845e484070a1f93fa24842db0e429c7cec9f81`) | Apache-2.0 |

## Product Patterns To Reuse

### Goose

Reference points:

- Canonical model registry: Goose keeps model metadata in a normalized registry
  that can map provider-specific model names to canonical model entries.
- Provider capability metadata: model entries include capabilities such as tool
  support, reasoning/thinking behavior, modalities, context limits, release
  metadata, and pricing. Provider registry entries expose known models and
  provider metadata separately from runtime credentials.
- Session import/export: Goose supports session export to a human-readable
  artifact and import from multiple session formats, including foreign agent
  session shapes.

Implications for `geond-agent`:

- Model picker data should come from a catalog-like boundary, not hard-coded UI
  conditionals.
- Provider route metadata should include capability, cost, and context fields
  even before direct provider calls exist.
- Session state should eventually have import/export contracts so local users
  can move work between adapters without losing history.

### Cline

Reference points:

- Provider/model catalog: Cline separates provider metadata, model metadata, and
  provider settings. Its catalog layer can describe provider protocols, model
  sources, default models, and capabilities.
- Z.ai/GLM route behavior: Cline documents Z.ai setup as a provider path and
  keeps region/endpoint/model availability as provider-specific configuration.
  Its model helper layer distinguishes GLM-like model families and reasoning
  routes, which is useful for thinking/reasoning mode separation.
- Host abstraction: Cline's host provider pattern keeps VS Code-specific
  services behind host bridges such as workspace, environment, window, diff,
  and terminal surfaces.
- Model picker UX: the TUI model selector handles provider choice, credential
  prompts, model refresh, known model lists, and thinking/reasoning controls as
  one guided flow.

Implications for `geond-agent`:

- Backend adapter selection and provider/model selection should stay separate
  but meet in a per-session snapshot.
- Z.ai support should model GLM thinking/reasoning variants explicitly instead
  of treating every model ID as a flat string.
- Desktop, terminal, and future IDE/plugin hosts should provide host services
  through narrow interfaces.

### OpenCode

Reference points:

- ACP session selected model/mode: OpenCode stores selected provider/model
  identifiers and mode/variant choices at the session layer.
- Provider/model dialogs: its TUI has explicit provider and model dialogs,
  including favorites, recent models, provider grouping, custom provider setup,
  and provider authentication flows.
- Permission diff prompt: edit approvals show file paths and diffs inside the
  permission prompt, with approval/reject stages.
- Plugin/TUI architecture: OpenCode has a target-specific TUI plugin boundary,
  plugin enablement state, keymap/route registration, and runtime plugin status.

Implications for `geond-agent`:

- Session records need selected backend, provider route, model profile, mode,
  and variant fields that can be replayed.
- Approval prompts should include the concrete diff or command output preview
  needed for a safe decision.
- UI extension points should be designed as explicit host slots and routes,
  with no third-party plugin code vendored into this repository.

### OpenHands

Reference points:

- LLM profiles: OpenHands exposes saved LLM profiles, active profile pointers,
  profile summaries with model/base URL/key-present metadata, and a conversation
  profile switch flow.
- Settings/secrets separation: settings hold typed agent and conversation
  configuration while secrets are modeled separately. API key surfaces expose
  presence flags instead of raw values.
- Usage/cost/context metrics: conversation metrics include accumulated cost,
  budget, token usage, and context window data.
- Security indicators: action security risk is tracked as explicit state and
  rendered with confirmation state.
- Secret safety: secret names and sizes are constrained, and reserved internal
  names/prefixes are blocked.

OpenHands caution:

- The root project is MIT-licensed, but `enterprise/` is under the PolyForm Free
  Trial license. `geond-agent` should not use `enterprise/` code as an
  implementation reference or source import unless a future legal review
  explicitly approves it.

Implications for `geond-agent`:

- Store user-visible settings separately from local-only secret stores.
- Render usage/cost/context information as first-class session metadata when an
  adapter can provide it.
- Approval and confirmation UIs should show risk level and current decision
  state, not only raw commands.

### Codex

Reference points:

- Protocol/event-driven UI: Codex describes a core engine driven by submission
  and event queues. User turns include context such as cwd, model, sandbox, and
  approval policy. Events include streaming agent text, turn lifecycle, approval
  requests, warnings, and errors.
- Exec policy: Codex has a command policy boundary for checking command
  decisions and requirement-provided rules. Policy decisions are handled
  separately from UI rendering.
- Approval overlays: the TUI maps exec, permission, patch, and MCP elicitation
  approval requests into explicit modal decisions. Pending approvals can be
  queued, delayed during typing, and dismissed by request identity.
- Snapshot-tested TUI quality: Codex TUI uses snapshot tests for chat widgets,
  bottom pane behavior, diff rendering, permission popups, markdown wrapping,
  status indicators, and resume/session pickers.
- TypeScript SDK JSONL boundary: `codex exec` exposes thread, turn, and item
  events. `agent_message`, `reasoning`, `command_execution`, `file_change`,
  `mcp_tool_call`, `web_search`, `todo_list`, and `error` item categories are
  useful adapter inputs for `WorkbenchEvent` replay.

Implications for `geond-agent`:

- Workbench UI should be driven by normalized backend events, not direct calls
  into one adapter's internal state.
- Approval policy, execution policy, and rendering state should be separate
  concerns.
- "Codex-level" quality must mean replayable event fixtures, approval overlay
  tests, diff/markdown/terminal rendering snapshots, and regression tests for
  keyboard/navigation behavior.

## Design Rules For geond-agent

- Use these projects as product and architecture references only.
- Record repository, commit, and license before any deeper reuse.
- Keep backend adapters and provider routes replaceable.
- Keep UI language, agent response language, backend selection, model profile,
  and routing mode as separate settings.
- Keep API keys, provider tokens, local session credentials, and account state
  out of tracked files.
- Treat source-available or proprietary areas as off limits until reviewed.
