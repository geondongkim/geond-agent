# ADR 0002: UI Localization Boundary

## Status

Accepted

## Context

`geond-agent` should support both English and Korean users from the first
implementation slice. The workbench is also an agent orchestration surface, so
UI language must not silently control prompt language, model routing, provider
settings, or external agent behavior.

## Decision

Create a localization boundary in `packages/ui-workbench` with initial support
for:

- English (`en`)
- Korean (`ko`)

The UI language setting defaults to detected system language and falls back to
English when detection fails. User selection is stored through a local settings
store interface instead of a concrete desktop framework API.

Keep these settings separate:

- UI language: controls workbench labels and UI copy.
- Agent response language: controls the preferred language for agent output or
  prompts when a bridge/provider chooses to honor it.

`apps/desktop` will later choose the native app framework and concrete local
settings backend. Provider packages receive explicit language preferences; they
must not infer prompt or model language from translated UI strings.

## Consequences

The first implementation can add English/Korean UI text and typed language
settings without committing to Electron, Tauri, SwiftUI, or another desktop
framework.

Agent bridge and provider packages stay independent from presentation strings.
This preserves clean boundaries for Claude Code ACP and Z.ai routing work, and
keeps `geond-agent-protocol` outside this repository.
