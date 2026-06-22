# GLM 5.2 Roadmap Advisory - Horizontal Expansion

This note records the third of four GLM 5.2 advisories requested on
2026-06-22. Claude Code was routed through the Z.ai `opus` alias and asked to
review how geond-agent should approach OpenCode/Cline horizontal expansion
without weakening the Claude-first implementation route.

The raw JSON response remains local under `/tmp` and is not committed.

## Scope

The advisory reviewed the current backend/model selectable workbench direction,
the Claude Code default-route decision, OpenCode/Cline evaluation history, and
the adapter-neutral workbench event model.

No secret values were requested, printed, or committed.

## Recommendation

GLM 5.2 recommended an **OpenCode-only fixture-replay adapter slice** as the
next horizontal-expansion PR.

The advisory explicitly recommends:

- do not add Cline in the same PR,
- do not add a live OpenCode runner yet,
- do not add a new Tauri command yet,
- do not make the PR docs-only,
- do not generalize the Claude runner into a broad runner registry before a
  second adapter has proven its shape.

## Architecture Slice

The proposed package is `packages/opencode-bridge`, containing:

- an external CLI boundary that does not bundle OpenCode,
- OpenCode backend capability metadata,
- a catalog entry that composes with existing provider/model entries,
- sanitized synthetic fixture envelopes,
- an envelope-to-`WorkbenchEvent` normalizer prototype,
- a fixture replay runner,
- redaction helpers and tests.

The desktop catalog should compose Claude Code and OpenCode backend entries so
the picker can show a second adapter while still keeping live execution limited
to the Claude route.

## PR Direction

Recommended PR:

**Add OpenCode fixture-replay adapter metadata and normalizer boundary.**

Acceptance criteria for that PR should include:

- OpenCode appears as a selectable backend candidate,
- OpenCode live execution is clearly unavailable or not implemented,
- fixture replay produces normalized workbench events,
- the event union does not expand unless a proven event requires it,
- no OpenCode source code or private logs are copied,
- Cline remains deferred.

## Deferred

- Cline adapter,
- OpenCode live runner,
- new Tauri OpenCode command,
- full runner registry abstraction,
- auto routing based on multiple backends,
- provider expansion unrelated to the adapter metadata.

## Controller Evaluation

This is the right horizontal-expansion move after the Claude path and approval
state are stable enough. It proves that the workbench is not Claude-only while
avoiding live-runner risk and avoiding a premature abstraction layer.

For sequencing, this should follow the Claude follow-up loop and the approval
materialization slice unless the immediate product goal is to demonstrate the
backend picker with a second adapter.
