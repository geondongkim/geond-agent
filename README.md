# geond-agent

`geond-agent` is a local-first agent workbench for coding agents, sessions,
diffs, tools, and long-running development loops.

The project starts from a simple idea: keep the native desktop experience of a
Goose-like frontend, connect it to powerful agent backends through ACP, and make
Z.ai GLM Coding Plan routing feel natural for everyday coding work.

## Project Status

Early scaffold. The repository currently contains project structure,
architecture notes, licensing policy, and integration plans. It does not yet
vendor or fork third-party application code.

## Goals

- Build a polished native workbench UI for local coding agents.
- Route agent sessions through ACP-compatible backends such as Claude Code.
- Support Z.ai GLM Coding Plan model routing for cost-effective long loops.
- Make plans, tool calls, terminal output, diffs, approvals, and session history
  first-class UI concepts.
- Keep provider credentials and subscription keys outside the repository.
- Keep `geond-agent-protocol` as a separate repository.

## Non-Goals

- This project does not bundle Claude Code, Z.ai services, Goose, or any paid
  model provider.
- This project does not bypass third-party product terms, quotas, or billing.
- This project does not copy proprietary Claude Code internals.
- This project is not affiliated with Anthropic, Z.ai, Goose, Cline, Kilo Code,
  OpenHands, OpenCode, or Factory.

## Repository Layout

```text
apps/
  desktop/                  Native desktop app and Goose UI integration.
packages/
  claude-code-bridge/       ACP bridge, Claude Code process/session mapping.
  zai-provider/             Z.ai endpoint/model-routing helpers.
  ui-workbench/             Shared workbench UI components.
docs/
  adr/                      Architecture decision records.
  guides/                   Setup and operating guides.
  reference/                Licensing, integrations, and source references.
```

## Planned Workbench Concepts

- Session sidebar for projects, pinned sessions, and recent work.
- Chat timeline with readable tool-call cards.
- Plan checklist with live task state.
- Terminal output panel with command status and errors.
- Diff review panel for file changes.
- Approval UI for filesystem, shell, network, and MCP actions.
- Backend bridge layer for ACP agents and provider-specific routing.
- Backend picker and model picker for per-session manual or auto routing.

## Integration Strategy

The first target stack is:

```text
Goose-style desktop frontend
  -> Claude Code ACP bridge
  -> Z.ai Anthropic-compatible endpoint
  -> GLM-4.7 for ordinary loops
  -> GLM-5.2 for hard coding tasks
```

The code should keep this bridge modular so that other ACP agents and providers
can be added without rewriting the desktop UI.

Claude Code is the first bridge target, not the only backend direction. The
workbench should stay adapter-neutral so future ACP-compatible backends,
external CLI tools, IDE/plugin-mediated tools, and provider-routing adapters can
share the same session, plan, diff, terminal, approval, and review surfaces.

## Docs

- [Project brief](docs/project-brief.md)
- [Architecture](docs/architecture.md)
- [Roadmap](docs/roadmap.md)
- [Repository structure](docs/repo-structure.md)
- [Setup guide](docs/guides/setup.md)
- [Integration notes](docs/reference/integrations.md)
- [Backend horizontal expansion plan](docs/plans/backend-horizontal-expansion.md)
- [Model and backend selection roadmap](docs/plans/model-and-backend-selection-roadmap.md)
- [Z.ai pre-subscription readiness](docs/plans/zai-pre-subscription-readiness.md)
- [Licensing policy](docs/reference/licensing.md)

## License

`geond-agent` is licensed under the [Apache License 2.0](LICENSE).

See [NOTICE](NOTICE) and [docs/reference/licensing.md](docs/reference/licensing.md)
for third-party reference and attribution guidance.
