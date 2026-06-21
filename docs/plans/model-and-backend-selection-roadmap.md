# Model and Backend Selection Roadmap

`geond-agent` should let users choose both the agent backend and the model path
for each local coding session. These choices should be visible, reviewable, and
preserved as session metadata without storing secrets or provider account state
in the repository.

## Why Separate Backend and Model Selection

Backend selection answers: who owns the agent session and tool execution?

Model selection answers: which model or routing policy should power the
reasoning/generation behind that session?

Keeping them separate lets `geond-agent` support combinations such as:

- backend: Claude Code adapter,
- provider route: Z.ai Anthropic-compatible endpoint,
- model profile: `glm-4.7`, `glm-5.2`, or `auto`.

This separation avoids coupling the UI to one tool or provider. It also makes it
possible to compare a provider through multiple agent tools, or compare multiple
providers through one backend adapter.

## GitHub Copilot Reference Patterns

The following are product patterns to study, not dependencies to add.

Official GitHub references checked on 2026-06-21:

- [GitHub Copilot app generally available](https://github.blog/changelog/2026-06-17-github-copilot-app-generally-available/)
- [Changing the AI model for GitHub Copilot Chat](https://docs.github.com/en/copilot/how-tos/use-ai-models/change-the-chat-model)
- [About Copilot auto model selection](https://docs.github.com/en/copilot/concepts/models/auto-model-selection)
- [Copilot SDK is now generally available](https://github.blog/changelog/2026-06-02-copilot-sdk-is-now-generally-available/)
- [Using your own LLM models in GitHub Copilot CLI](https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/use-byok-models)

Patterns to learn from:

- Model picker: users can choose from available models per chat or agent
  surface.
- Auto model selection: the product can route based on task complexity,
  availability, reliability, quota, and cost.
- BYOK/BYOM: users or organizations may bring an external provider, compatible
  endpoint, or local model.
- MCP/tool connection: agent sessions can connect external tools without
  hard-coding them into the UI.
- Per-session choice: a session should retain the selected backend/model context
  that was used to create or resume work.

Do not copy GitHub/Copilot code, add Copilot SDK dependencies, call GitHub APIs,
or commit GitHub/Copilot credentials as part of this roadmap.

## Long-Term geond-agent Direction

### Backend Picker

The backend picker chooses the execution owner for a session.

Candidate backends:

- Claude Code adapter,
- ACP-compatible backend,
- external CLI/process backend,
- IDE/plugin mediated backend,
- future Copilot SDK-like embedded backend,
- local model backend,
- provider/model routing backend when the route itself owns execution.

### Model Picker

The model picker chooses a model profile from the selected provider route or
adapter capabilities.

Initial profiles can include:

- `glm-4.7`,
- `glm-5.2`,
- `sonnet` alias for normal Claude Code implementation work,
- `opus` alias for hard feature and architecture slices,
- `auto`.

The picker should show model availability and constraints without exposing API
keys or account state.

### Auto Routing

Auto routing should be added after manual selection is stable.

Inputs to consider:

- task complexity,
- model availability,
- quota/cost,
- reliability,
- context window or tool-calling requirements,
- user preference for speed or quality.

### Provider Registry

The provider registry describes configured provider routes, not secret values.

It can expose:

- provider name,
- endpoint kind,
- supported model profiles,
- capability metadata,
- whether credentials are present locally.

### Model Catalog

The model catalog describes model profiles and aliases.

It can expose:

- display name,
- provider-specific model identifier,
- capability tags,
- routing cost class,
- recommended task class,
- availability state.

### Session-Level Selection Snapshot

Every session should capture:

- backend adapter ID,
- provider route ID,
- model profile ID,
- routing mode (`manual` or `auto`),
- agent response language,
- capability metadata observed at session start or resume.

This snapshot helps review, reproduce, and compare sessions even when provider
catalogs change later.

### Usage, Quota, and Cost Metadata

The workbench should eventually surface usage and quota/cost metadata when a
backend or provider can report it.

Examples:

- selected model after auto routing,
- quota/rate-limit state,
- rough cost tier,
- provider health or availability state,
- whether a model was unavailable and replaced by a fallback.

## Initial Implementation Order

1. Done: add a document/type-level selection model.
2. Done: add a Z.ai model profile catalog.
3. Done: add a Claude Code backend profile.
4. Done: add a neutral workbench selection catalog consumed by desktop picker
   options and bridge selection normalization.
5. Pave the Claude Code implementation route through event normalization,
   session/resume handling, and permission metadata.
6. Use manual routing first: `sonnet` alias for normal work, `opus` alias for
   hard feature/architecture work.
7. Done: add a UI settings boundary for backend/model picker data.
8. Done: add a per-session backend/model selection snapshot.
9. Add OpenCode as the next horizontal-expansion route after the Claude Code
   path is stable.
10. Add auto routing policy after manual selection and metadata reporting are
   stable.

## Do Not Do Yet

- Do not add the GitHub Copilot SDK as a dependency.
- Do not implement real provider calls.
- Do not store API keys, tokens, provider account state, or local session state
  in tracked files.
- Do not copy third-party source code.
- Do not absorb `geond-agent-protocol` into this repository.
- Do not make `geond-agent-protocol` storage required for the desktop MVP.
