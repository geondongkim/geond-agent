# Contributing

Thanks for your interest in `geond-agent`.

This project is early and intentionally keeps a clean boundary between original
code, external tools, and third-party references.

## Ground Rules

- Keep credentials, API keys, tokens, session stores, and provider secrets out of
  the repository.
- Do not copy proprietary Claude Code internals or bundled application assets.
- Do not vendor third-party source code unless its license is reviewed and its
  notices are preserved.
- Prefer small changes with clear package ownership.
- Document architecture decisions in `docs/adr/` when they affect public APIs,
  repo structure, licensing, or provider behavior.

## License of Contributions

Unless explicitly stated otherwise, contributions submitted to this repository
are licensed under the Apache License 2.0.

## Development Shape

The intended package boundaries are:

- `apps/desktop`: native desktop application and workbench shell.
- `packages/claude-code-bridge`: ACP bridge and session mapping.
- `packages/zai-provider`: Z.ai provider helpers and model routing.
- `packages/ui-workbench`: shared UI components.

Keep bridge/provider logic outside UI packages when possible.
