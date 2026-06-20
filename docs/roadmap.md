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
- Launch Goose-style session from the desktop shell.
- Route session through `claude-agent-acp`.
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
- Backend and Model Picker UX:
  - backend picker for Claude Code adapter, ACP-compatible backend, external
    CLI/process backend, IDE/plugin mediated backend, and future local model or
    SDK-like backends,
  - model picker for manual per-session model selection,
  - separate controls for UI language, agent response language, backend
    selection, provider route, and model selection.

## Milestone 3: Review and Approval UX

- File change review.
- Accept/reject/revert flow.
- Command approval prompts.
- MCP/network approval prompts.
- Failure summaries for tests and commands.
- Per-session backend/model selection snapshot shown alongside review and
  approval metadata.

## Milestone 4: Session Continuity

- Session search.
- Pinned sessions.
- Claude Code session list experiment.
- ACP resume/fork bridge experiment.
- Workspace-level session metadata.
- Resume/fork behavior that preserves the session's selected backend, provider
  route, model profile, and routing mode.

## Milestone 5: Provider and Agent Expansion

- Direct Z.ai provider mode.
- Claude Code ACP mode.
- Other ACP-compatible agent backends.
- Local model provider experiments.
- Extension/MCP management.
- Provider-aware agent language preferences that remain separate from UI
  localization.
- Model catalog, provider registry, and auto routing policy:
  - catalog Z.ai model profiles such as `glm-4.7`, `glm-5.2`, and `auto`,
  - keep provider routes separate from backend adapters,
  - evaluate GitHub Copilot app and Copilot Chat as reference products for
    model picker, auto model selection, BYOK/BYOM, and MCP/tool connection
    patterns,
  - add future Copilot SDK-like backend research without adding GitHub/Copilot
    dependencies to the repo.
- Backend selection after the Claude Code first target:
  - ACP-compatible backend,
  - external CLI/process backend,
  - IDE/plugin mediated backend,
  - future SDK-like embedded backend,
  - local model backend,
  - provider/model routing backend.
