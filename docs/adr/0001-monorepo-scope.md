# ADR 0001: Monorepo Scope

## Status

Accepted

## Context

`geond-agent` is intended to become a desktop-first local agent workbench. The
project should combine Goose-style native agent orchestration, Claude Code ACP
bridge experiments, and Z.ai GLM Coding Plan model routing.

`geond-agent-protocol` remains a separate repository and should not be folded
into this monorepo.

## Decision

Use an Apache-2.0 licensed, TypeScript-oriented monorepo with separate app and
package boundaries:

- `apps/desktop` for the native desktop experience.
- `packages/claude-code-bridge` for Claude Code ACP bridge behavior.
- `packages/zai-provider` for provider/model routing helpers.
- `packages/ui-workbench` for reusable workbench UI components.

Public repository hygiene files such as `LICENSE`, `NOTICE`, `CONTRIBUTING.md`,
`SECURITY.md`, and `docs/reference/licensing.md` are part of the initial scope.

## Consequences

The repo can evolve incrementally without mixing UI, provider configuration, and
agent bridge code into a single package. The first implementation can stay thin
while preserving clear ownership boundaries for later Goose fork integration.

`geond-agent-protocol` remains outside this repository.
