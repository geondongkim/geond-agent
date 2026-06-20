# Desktop App

Native desktop app layer for `geond-agent`.

## Responsibility

- Own native app shell and window layout.
- Render the agent workbench surface.
- Connect UI state to bridge/provider packages through narrow interfaces.
- Keep provider secrets out of UI code.

## Planned Surfaces

- Session sidebar
- Chat timeline
- Plan panel
- Tool-call cards
- Terminal output
- Diff review
- Approval prompts

This app may learn from Goose Desktop UX patterns, but third-party source code
must not be copied without preserving its license and notices.

## Current Boundary

`apps/desktop` currently exposes `createDesktopWorkbench`, a framework-neutral
bootstrap helper that composes:

- `packages/ui-workbench` language settings and i18n runtime,
- `packages/zai-provider` endpoint/model routing helpers,
- `packages/claude-code-bridge` external CLI/ACP boundary.

The desktop framework remains undecided.
