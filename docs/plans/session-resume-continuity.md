# Session Resume and Continuity Plan

## Goal

Make Claude Code sessions long-lived in the local workbench without turning
`geond-agent` into a Claude Code-only app.

The workbench owns the local session id and event stream. Claude Code owns its
external conversation id. The bridge links the two through an adapter-neutral
event.

## Boundary

`session.adapter.linked` records the mapping:

- `sessionId`: local workbench session id,
- `adapterId`: backend adapter id,
- `externalSessionId`: adapter-owned conversation/session handle,
- `resumedFromExternalSessionId`: optional previous handle used for resume.

The event is persisted like other `WorkbenchEvent` records, replayed into
session snapshots, and projected into UI state. UI code should not infer a
Claude-specific meaning from the field name.

## Claude Code CLI Shape

Fresh run:

```text
claude --bare -p --verbose --output-format stream-json --session-id <workbenchSessionId> ...
```

Resume run:

```text
claude --bare -p --verbose --output-format stream-json --resume <externalSessionId> ...
```

The Tauri stream channel remains the local workbench session id in both cases.
That keeps live stdout/stderr routing independent from Claude Code's own
conversation handle.

## Current Slice

- Add `session.adapter.linked` to the shared workbench event union.
- Replay adapter links into `externalSessions` on each session snapshot.
- Mark completed, failed, or paused adapter-linked sessions as resumable.
- Emit adapter links from real Claude Code `system/init` records.
- Build `--resume` commands when a known external session id exists.
- Add a desktop Resume action for completed linked sessions.
- Keep command validation strict in the Tauri boundary.

## Security Notes

- API keys, tokens, provider account state, raw Claude logs, and private local
  session files remain outside committed state.
- The external session id is adapter metadata, not a provider secret, but the UI
  should avoid repeating it in command-output logs.
- Resume ids are not accepted as free-form user input in this slice; they come
  from prior normalized adapter events.

## Deferred

- Session listing from Claude Code local storage.
- Fork/divergent-history UX.
- ACP resume/fork behavior.
- Approval forwarding into Claude Code.
- Provider registry and auto-routing policy.
- OpenCode/Cline horizontal route implementation.
