# UI Workbench

Shared workbench UI components for `geond-agent`.

## Initial Component Targets

- Session sidebar
- Tool call cards
- Plan checklist
- Diff review panel
- Terminal output panel
- Permission and approval prompts
- Settings boundary for UI language and agent response language

## Design Direction

The UI should feel like a workbench, not just a chat transcript. Agent actions
must be reviewable, reversible, and easy to scan during long coding loops.

## Localization Boundary

The package currently exposes a framework-neutral runtime for UI language
settings:

```ts
import {
  createMemoryLocalSettingsStore,
  createWorkbenchRuntime
} from "@geond-agent/ui-workbench";

const runtime = await createWorkbenchRuntime({
  settingsStore: createMemoryLocalSettingsStore(),
  systemLocales: ["ko-KR", "en-US"]
});

await runtime.setUiLanguage("ko");
await runtime.setAgentResponseLanguage("en");
```

UI language controls workbench labels. Agent response language is a separate
preference that bridge/provider packages may pass to model prompts later.

## Future Direction

The UI workbench should eventually render backend picker and model picker
surfaces. These controls must come from adapter/provider capability metadata, so
the UI can show choices such as Claude Code adapter, ACP-compatible backend,
external CLI/process backend, local model backend, Z.ai model profiles, and
`auto` routing without storing provider secrets or account state.

UI language, agent response language, backend selection, provider route, model
profile, and routing mode are separate settings.
