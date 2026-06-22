# Claude Code Approval Forwarding Probe

This note records the local probe that shaped the first approval-review slice.
It intentionally summarizes the observed shape instead of committing raw Claude
Code output.

## Probe Setup

- Tool route: Claude Code CLI through the local Z.ai Anthropic-compatible
  environment.
- Model alias: `sonnet`.
- Permission mode: `default`.
- Output mode: `--bare -p --verbose --output-format stream-json`.
- Workspace: temporary directory under `/tmp`.
- Logs: local-only `/tmp` probe output, not tracked by git.

The prompt asked Claude Code to create one temporary file in the probe
workspace. The goal was to see whether a live approval request appeared as a
stream event, final result field, stderr diagnostic, or process failure.

## Observed Shape

The run exited successfully but did not modify the file without approval. The
final `result` record included a `permission_denials` array with one object per
blocked tool attempt.

The useful fields were:

- `tool_name`, such as `Bash` or `Edit`,
- `tool_use_id`,
- `tool_input.command` for command requests,
- `tool_input.file_path` for filesystem requests.

The `system/init` record also described the permission mode and available tools,
but raw environment/source fields from local runs must not be committed.

## Workbench Mapping

`result.permission_denials` maps to local pending approval events:

- `Bash` becomes approval kind `command`,
- `Edit`, `MultiEdit`, `NotebookEdit`, and `Write` become approval kind
  `filesystem`,
- unknown tool names fall back to `mcp` unless a file path is present,
- command text or file path becomes the approval subject,
- ids are derived from the Claude Code `tool_use_id` when present.

This gives the workbench a deterministic approval queue even before interactive
approval forwarding exists.

## Current Decision

The implementation supports **approval detection, review, and print-mode
follow-up**, not interactive forwarding. Users can inspect the denied
command/file request and record an approve/reject decision in local workbench
state. When a completed or failed Claude live session has an external session
link, an approved decision can resume Claude Code with `--resume
<externalSessionId>` and a scoped follow-up prompt. File/diff approvals use a
one-run `acceptEdits` override, while command/network/MCP approvals stay in
`default` permission mode. The stored session defaults are not changed.

Interactive stdin-style forwarding back into a still-running Claude Code
process remains deferred until Claude Code exposes a stable approval-forwarding
boundary.

## Safety Rules

- Do not commit raw Claude Code stream logs.
- Do not commit API keys, tokens, provider account state, or local session
  state.
- Keep probe fixtures sanitized and minimal.
- Keep `bypassPermissions` out of normal persisted UI defaults.
