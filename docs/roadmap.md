# Roadmap

## Milestone 0: Repository Hygiene

- Public repository metadata.
- Apache-2.0 license.
- Third-party notices policy.
- Clear package boundaries.
- Setup and integration docs.

## Milestone 1: Local Bridge Spike

- Make the pnpm workspace installable and type-checkable.
- Add initial UI localization settings for English and Korean.
- Scaffold the Tauri v2 desktop shell with a React + Vite + TypeScript renderer.
- Add Tailwind CSS and shadcn/ui component conventions without weakening local
  workbench ownership of timeline, diff, terminal, approval, and picker UI.
- Route the first implementation path through the Claude Code external CLI/ACP
  boundary.
- Normalize Claude Code `--bare -p --verbose --output-format stream-json` into
  workbench events using real envelope-shaped sanitized fixtures, including text
  deltas, tool call/result records, run completion, and usage metadata.
- Persist local sessions/events/snapshots in SQLite after the event shape is
  stable enough to replay.
- Verify Z.ai endpoint/model routing.
- Show basic session status and backend metadata.

## Milestone 2: Workbench UI

- Session sidebar.
- Chat timeline.
- Tool-call cards.
- Plan/checklist panel.
- Terminal output panel.
- Diff summary panel.
- Settings surface for UI language and separate agent response language.
- Tauri app data JSON for small non-secret preferences.
- SQLite-backed local sessions, events, snapshots, approvals, tool calls,
  command output summaries, diff summaries, and usage metadata.
- Backend and Model Picker UX:
  - backend picker for Claude Code adapter, ACP-compatible backend, external
    CLI/process backend, IDE/plugin mediated backend, and future local model or
    SDK-like backends,
  - model picker for manual per-session model selection,
  - separate controls for UI language, agent response language, backend
    selection, provider route, and model selection.
- Workbench UX quality bar:
  - event-driven rendering from normalized backend events,
  - fixture replay tests for session state,
  - Vitest coverage for reducers, parsers, settings, and i18n helpers,
  - compact and wide layout snapshots for dense workbench surfaces,
  - complete English/Korean labels for settings, picker, approval, and status
    surfaces.

## Milestone 3: Review and Approval UX

- File change review.
- Accept/reject/revert flow.
- Command approval prompts.
- MCP/network approval prompts.
- Failure summaries for tests and commands.
- Per-session backend/model selection snapshot shown alongside review and
  approval metadata.
- Permission and approval surfaces that show concrete command, diff, risk,
  policy, and available decisions before the user confirms.

## Milestone 4: Session Continuity

- Session search.
- Pinned sessions.
- Claude Code session list experiment.
- ACP resume/fork bridge experiment.
- Workspace-level session metadata.
- Resume/fork behavior that preserves the session's selected backend, provider
  route, model profile, and routing mode.
- Session import/export research based on adapter-neutral history snapshots, so
  future adapters can move local work without binding the workbench to one
  external tool's session format.
- Optional `geond-agent-protocol` export/import research for shared evidence
  without making protocol storage required for the desktop MVP.

## Milestone 5: Provider and Agent Expansion

- Direct Z.ai provider mode.
- Claude Code ACP mode.
- Other ACP-compatible agent backends.
- Optional `geond-agent-protocol` integration for shared memory, reservations,
  handoffs, review context, and cross-agent evidence.
- Local model provider experiments.
- Extension/MCP management.
- Provider-aware agent language preferences that remain separate from UI
  localization.
- Model catalog, provider registry, and auto routing policy:
  - catalog Z.ai model profiles such as `glm-4.7`, `glm-5.2`, and `auto`,
  - keep provider routes separate from backend adapters,
  - include provider capability metadata such as tool support, reasoning or
    thinking support, context limits, pricing/cost visibility, quota visibility,
    and modality support,
  - evaluate GitHub Copilot app and Copilot Chat as reference products for
    model picker, auto model selection, BYOK/BYOM, and MCP/tool connection
    patterns,
  - use OSS workbench references such as Goose, Cline, OpenCode, OpenHands, and
    Codex as design-pattern inputs only; do not copy source code without license
    review,
  - add future Copilot SDK-like backend research without adding GitHub/Copilot
    dependencies to the repo.
- Backend selection after the Claude Code first target:
  - keep Claude Code as the default implementation route until session/event
    normalization is stable,
  - defer OpenCode as the next horizontal-expansion route,
  - ACP-compatible backend,
  - external CLI/process backend,
  - IDE/plugin mediated backend,
  - future SDK-like embedded backend,
  - local model backend,
  - provider/model routing backend.
