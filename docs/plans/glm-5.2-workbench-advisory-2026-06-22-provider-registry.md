# GLM 5.2 Workbench Advisory - Provider Registry

This note records the Claude Code `opus` advisory requested before this
implementation loop. Claude Code was routed through the local Z.ai
Anthropic-compatible environment. The raw JSON output was not committed.

## Prompt Scope

GLM 5.2 was asked to inspect the current `main` state after the shell
decomposition PR:

- roadmap, architecture, desktop stack ADR, and shell decomposition ADR,
- workbench UX quality bar,
- backend/model selection roadmap,
- Claude Code route decision and session continuity docs,
- UI workbench event/replay/projection/settings code,
- Z.ai provider helpers,
- Claude Code bridge normalizer and runner code,
- desktop panes, hooks, persistence, Tauri runner, and tests.

No file edits were delegated to Claude Code. The output was planning and
prioritization advice only.

## Recommendation

The advisory recommended the next large PR should be **backend/model picker and
provider registry polish**, with inspector per-tab decomposition included as the
feature-driven reason to split the inspector.

The key finding was that selection metadata existed in multiple places:

- hardcoded picker options in the desktop inspector,
- Z.ai provider catalog helpers,
- Claude Code bridge capability metadata,
- bridge-local fallback lookup logic inside the stream-json normalizer.

That duplication would make future backend expansion brittle.

## Accepted Direction

I accepted this recommendation and implemented the slice around one rule:

> backend adapter, provider route, and model profile labels/capabilities must
> come from one registry-shaped catalog boundary.

This PR therefore:

- adds a neutral `WorkbenchSelectionCatalog`,
- exposes Z.ai provider route/model entries in that catalog shape,
- exposes Claude Code backend capability metadata in that catalog shape,
- derives desktop picker options from the composed catalog,
- uses the same catalog for live-run selection snapshots,
- uses the same catalog for Claude Code stream-json selection normalization,
- splits the inspector into per-tab modules.

## Deferred

- Approval forwarding into Claude Code still waits for a confirmed permission
  event shape.
- Auto routing remains metadata only.
- SQLite snapshot materialization is still premature until replay performance
  becomes measurable.
- OpenCode/Cline registry entries remain a later horizontal-expansion PR.
- No provider API calls, provider account introspection, or secret storage are
  added in this slice.

## Acceptance Criteria

- No pane-local backend/provider/model option arrays remain.
- Settings picker options come from the desktop workbench catalog.
- Selection snapshots and bridge-normalized selection metadata share catalog
  lookup behavior.
- Inspector tabs live in focused modules.
- API key state remains a boolean/enum presence signal only.
- `pnpm verify`, `pnpm test:e2e`, CI, and secret scans stay green.
