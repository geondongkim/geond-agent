# GLM 5.2 Roadmap Advisory - Claude Code Deepening

This note records the first of four GLM 5.2 advisories requested on
2026-06-22. Claude Code was routed through the Z.ai `opus` alias and asked to
review the current repo state before recommending the next architecture slice,
large-refactor stance, PR direction, and long-term roadmap fit.

The raw JSON response remains local under `/tmp` and is not committed.

## Scope

The advisory focused on whether the next Claude-first work should pursue:

- interactive approval forwarding,
- Claude Code local session list or import,
- fork or divergent history support,
- ACP resume/fork support,
- or a deeper print-mode continuation path.

No secret values were requested, printed, or committed.

## Recommendation

GLM 5.2 recommended **not** choosing interactive approval forwarding, Claude
session import, fork/divergent history, or ACP resume/fork as the next PR.

The preferred slice is a print-mode-compatible approval/resume loop:

- keep the confirmed `--bare -p --verbose --output-format stream-json` route,
- treat local approval resolution as a review decision,
- re-run with `--resume <externalSessionId>` and an adjusted permission mode or
  follow-up prompt,
- preserve the external Claude session id as adapter metadata rather than as
  the workbench session id.

## Architecture Slice

The proposed implementation spans three boundaries:

- `packages/claude-code-bridge`: add a follow-up command builder for resumed
  print-mode runs and test more denial shapes.
- `packages/ui-workbench`: keep the approval and resume projection
  adapter-neutral, with durable metadata for permission mode and selection
  snapshot.
- `apps/desktop`: expose a narrow "re-run with resolution" action only when a
  completed or failed session has pending approval review and an adapter link.

The advisory explicitly treats stdin-based live approval forwarding as blocked
by the current process model: the current runner captures stdout/stderr, while
Claude Code print mode emits permission denials in the terminal result after the
run exits.

## PR Direction

Recommended PR:

**Claude Code print-mode follow-up loop and durable resume snapshot.**

Acceptance criteria for that PR should include:

- a resumed run uses the existing external adapter session id,
- user approval decisions do not change persisted global permission defaults,
- `bypassPermissions` stays out of normal saved settings,
- denial fixtures cover write/edit and command-denial variants,
- the workbench event stream remains replayable from normalized events.

## Deferred

- interactive stdin approval forwarding,
- Claude Code local session storage import,
- fork/divergent history UI,
- ACP resume/fork,
- generic process transport refactors.

## Controller Evaluation

This is the right next slice if the project chooses to deepen the Claude Code
route immediately. It also fits the product decision that Claude Code remains
the first paved implementation path while OpenCode and Cline stay comparison
routes.

The only sequencing question is whether this should precede the persistence
materialization work. If the next goal is user-visible Claude workflow quality,
pick this. If the next goal is storage durability and review-state correctness,
pick the persistence slice first.
