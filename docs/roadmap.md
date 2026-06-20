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

## Milestone 3: Review and Approval UX

- File change review.
- Accept/reject/revert flow.
- Command approval prompts.
- MCP/network approval prompts.
- Failure summaries for tests and commands.

## Milestone 4: Session Continuity

- Session search.
- Pinned sessions.
- Claude Code session list experiment.
- ACP resume/fork bridge experiment.
- Workspace-level session metadata.

## Milestone 5: Provider and Agent Expansion

- Direct Z.ai provider mode.
- Claude Code ACP mode.
- Other ACP-compatible agent backends.
- Local model provider experiments.
- Extension/MCP management.
- Provider-aware agent language preferences that remain separate from UI
  localization.
