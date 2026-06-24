# Codex CLI SDK Reference Notes

These notes record the `openai/codex` source areas inspected before deepening
`packages/codex-cli-bridge`. The local clone is a research input, not vendored
source.

## Snapshot

- Repository: `openai/codex`
- Local path: `output/local/reference-repos/openai-codex`
- Investigated commit: `98845e484070a1f93fa24842db0e429c7cec9f81`
- License: Apache-2.0
- Notice: upstream `NOTICE` begins with `OpenAI Codex Copyright 2025 OpenAI`
  and includes additional notice text for derived dependencies.

## Files Read

- `sdk/typescript/src/events.ts`
- `sdk/typescript/src/items.ts`
- `sdk/typescript/src/exec.ts`
- `sdk/typescript/src/threadOptions.ts`
- `sdk/typescript/tests/runStreamed.test.ts`

## Implementation Insights

- Codex `exec` JSONL is modeled around `thread.started`, `turn.started`,
  `item.started`, `item.updated`, `item.completed`, `turn.completed`,
  `turn.failed`, and `error` records.
- Thread items are the durable workbench bridge shape. Useful item types include
  `agent_message`, `reasoning`, `command_execution`, `file_change`,
  `mcp_tool_call`, `web_search`, `todo_list`, and `error`.
- Prompt input is sent to the child process stdin in the TypeScript SDK instead
  of being appended as a visible argv string. `geond-agent` should keep command
  previews secret-safe and mark prompt presence without logging the full prompt.
- The inspected TypeScript SDK used `--experimental-json`, while the locally
  installed Codex CLI `0.142.0` exposes `--json` in `codex exec --help`.
  `geond-agent` defaults to the stable flag but keeps an explicit experimental
  mode for upstream-compatibility probes.
- Approval and sandbox policy are separate concepts. The SDK maps approval
  through config and sandbox through a separate flag, which matches the
  `geond-agent` SDK policy split.
- Resume uses an external thread id. `geond-agent` should treat that id as
  adapter-owned session metadata, not as the local workbench session id.
- Usage is emitted at `turn.completed`, with input, cached input, output, and
  reasoning token fields. This maps cleanly into `usage.reported` events.

## geond-agent Adaptation

`packages/codex-cli-bridge` now follows this upstream event shape without
copying upstream implementation files:

- `jsonl.ts` maps Codex thread/item JSONL records into SDK-shaped
  `WorkbenchEvent` streams.
- `jsonl.fixtures.ts` provides a small sanitized synthetic fixture following
  the upstream event names and item categories.
- `runner.ts` builds a Codex `exec` JSONL boundary with stdin prompt handling,
  sandbox policy mapping, approval policy mapping, ephemeral local state by
  default, selectable stable/experimental JSON flags, and external thread
  resume metadata.
- `apps/desktop` can expose a Codex JSONL fixture runner mode so UI surfaces
  are no longer Claude-only.

## Reuse Boundary

This slice uses source inspection and event-shape adaptation, not copied source
files. If a future PR copies upstream code directly, it must preserve the
Apache-2.0 license, upstream NOTICE requirements, and any modified-file notes
required by the repository licensing policy.
