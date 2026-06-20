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

The UI quality target is defined in
`../../docs/plans/workbench-ux-quality-bar.md`. "Codex-level" means verifiable
behavior: event replay fixtures, approval/diff snapshots, keyboard and pointer
coverage, compact/wide layout checks, complete English/Korean labels, explicit
failure states, and clean secret scans.

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

## Event Replay Boundary

The package exposes normalized workbench events and deterministic replay helpers
for pre-UI evaluation skeletons:

```ts
import {
  replayWorkbenchEvents,
  ZAI_PRE_SUBSCRIPTION_SAMPLE_EVENTS
} from "@geond-agent/ui-workbench";

const state = replayWorkbenchEvents(ZAI_PRE_SUBSCRIPTION_SAMPLE_EVENTS);
```

The replay state includes session lifecycle, assistant text, plan updates, tool
calls, command output, diffs, approvals, warning/error notices, and the
per-session backend/model selection snapshot.

## Future Direction

The UI workbench should eventually render backend picker and model picker
surfaces. These controls must come from adapter/provider capability metadata, so
the UI can show choices such as Claude Code adapter, ACP-compatible backend,
external CLI/process backend, local model backend, Z.ai model profiles, and
`auto` routing without storing provider secrets or account state.

UI language, agent response language, backend selection, provider route, model
profile, and routing mode are separate settings.

Reference workbench patterns are tracked in
`../../docs/research/oss-agent-workbench-reference.md`. The package should learn
from Goose-style model registries, Cline-style provider/model catalogs,
OpenCode-style provider/model dialogs and permission diff prompts,
OpenHands-style profiles/metrics/security indicators, and Codex-style
event-driven UI and snapshot-tested TUI behavior. Those are design references
only; no upstream UI code is vendored here.
