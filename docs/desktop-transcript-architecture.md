# Desktop transcript & session architecture

This document explains how the geond-agent desktop app turns backend stream
events into a conversational chat UI, how sessions/workspaces are linked, and
the extension points (adding a transcript variant, a new event type, or a new
markdown renderer). Read this before changing the chat UX.

## Data flow

```
backend stream (claude --bare stream-json / codex jsonl)
  └─> WorkbenchEvent[]            (packages/backend-adapter-sdk/src/events.ts)
        persisted in workbench_events (Rust), replayed by the controller
        └─> projectWorkbenchEvents   (packages/ui-workbench/src/workbench/projection.ts)
              ├─ timeline: flat event list          (inspector / debug)
              └─ messages: ChatTurn[] (user/assistant)  (chat pane)
                    └─> ChatTranscript               (apps/desktop/src/panes/chat-transcript.tsx)
                          picks a TranscriptVariant → CompactTranscriptView
                            └─> TimelineMarkdown     (apps/desktop/src/components/workbench/timeline-markdown.tsx)
                                  react-markdown + remark-gfm + rehype-highlight
```

Two projections run off the same events:
- `timeline` — the original flat event log (kept for the inspector/debug surfaces).
- `messages` — conversational turns used by the main chat pane.

## Event model

`WorkbenchEvent` (`packages/backend-adapter-sdk/src/events.ts`) is a tagged union.
Events are persisted generically (`payload_json`) and the Rust append path uses
a `_ => {}` fallback per event type, so adding a type needs **no schema
migration**.

### Adding a new event type

When you add a member to the `WorkbenchEvent` union, update every exhaustive
`switch (event.type)` or `tsc` will fail:

1. `events.ts` — add the variant to the union.
2. `packages/ui-workbench/src/workbench/event-identity.ts` — add a dedup key.
3. `packages/ui-workbench/src/workbench/replay.ts` (`applyWorkbenchEvent`) —
   update session state (a no-op `updatedAt` touch is fine if the event is
   purely presentational).
4. `packages/ui-workbench/src/workbench/session-index.ts`
   (`applyWorkbenchSessionIndexEvent`) — update the session list entry.
5. Emit it from the runner prelude (`apps/desktop/src/runs/live-run-events.ts`)
   if it is user-facing.
6. Render it: add a case to `projectTimelineEntry` (flat timeline) and/or
   `projectChatTranscript` (chat turns) in `projection.ts`.

`user.message` is the reference example (added in this change): user turns were
previously invisible because only `run.attempt.started.promptSummary` stored the
prompt. `user.message` is emitted first in `createLiveRunPreludeEvents` /
`createCodexLiveRunPreludeEvents` and grouped into a `ChatUserTurn`.

## Turn projection (`projectChatTranscript`)

`projectChatTranscript(events)` (in `projection.ts`) walks events in order and
groups them into `ChatTurn`s:

- `user.message` → closes the current assistant turn, opens a `ChatUserTurn`.
- `assistant.text.delta` → accumulates text into one `ChatAssistantMessage`
  keyed by `messageId` (streaming = true). This **eliminates the per-delta card
  noise** of the flat timeline.
- `assistant.text.completed` → finalizes that message (streaming = false).
- tool/command/diff/plan/usage/approval/warning/error → attaches as collapsed
  `ChatActivityEntry` to the surrounding assistant turn.
- session/selection/adapter/context metadata → ignored in the chat view.

`ChatAssistantTurn.streaming` is true while any of its messages is streaming.

## ChatTranscript & the variant seam

`ChatTranscript` (`apps/desktop/src/panes/chat-transcript.tsx`) owns:

- the scroll container + stick-to-bottom auto-scroll (follows new content when
  parked at the bottom; force-scrolls to the bottom on session change), and
- variant dispatch via the `transcriptViews` registry:

```ts
export type TranscriptVariant = "compact" | "bubbles";
const transcriptViews: Record<TranscriptVariant, FC<TranscriptViewProps>> = {
  compact: CompactTranscriptView,
  bubbles: CompactTranscriptView // placeholder
};
```

The current renderer is `CompactTranscriptView` (codex-level: clean user /
assistant turns, activity collapsed). `bubbles` currently aliases compact.

### Adding a "bubbles" variant (Claude.ai / ChatGPT-style)

1. Implement `BubbleTranscriptView` in `chat-transcript.tsx` (same
   `TranscriptViewProps`: `{ turns, i18n }`). It consumes `ChatTurn[]` — no
   projection change needed.
2. Register it: `transcriptViews.bubbles = BubbleTranscriptView`.
3. Add a session setting that selects the variant (e.g. extend
   `WorkbenchSessionDefaults` with `transcriptVariant`) and pass it as
   `<ChatTranscript variant={...} />` from `TimelinePane`.

The projection (`messages`) and the event model do not change — only the view.

## Session continuity (resume vs new)

A session is a conversation thread, not a single message. The dispatch logic
lives in `apps/desktop/src/lib/use-workbench-actions.ts`:

- `startSelectedRunner` (Send button / Enter): if the active session has a live
  backend session linked (`activeExternalSession`), it **continues** that
  conversation — `startSession(mode, { resumeSessionId, externalSessionId })`,
  which drives `claude --resume` / the codex thread, appending to the **same**
  session id. Otherwise it starts a new session.
- `startNewSession` ("+" button / command palette "New session"): always starts
  a fresh session.

`sessionId` is decided in `apps/desktop/src/runs/use-workbench-runner.ts`
(`options.resumeSessionId ?? \`local-session-${Date.now()}\``) and activated via
`appendEvents(..., { activateSessionId })`. Continuing reuses the existing id, so
the sidebar shows one continuous thread per conversation instead of one fragment
per message.

## Workspace ↔ session linkage

Each session stores its `workspacePath` (from the run request). The sidebar
groups sessions by `workspacePath` (`createWorkspaceSessionGroups`); any path not
in the known-workspace list still gets an auto-created group labelled by its
basename. Workspace options (`use-workbench-derived-state.ts`) merge
`projection.workspaces` (derived from sessions) with saved/selected workspaces,
so sessions created in other folders are reachable. `.env.local`-based provider
key presence is read per-workspace via the `read_local_provider_environment`
Tauri command.

### Codex-style workspace rail

- **New chat per workspace** (`WorkspaceSessionList`): each workspace header has
  a `+` button that calls `createNewChat(workspacePath)` — it mints a session id
  and emits a `session.lifecycle` "started" event scoped to that workspace,
  creating an empty placeholder that the sidebar shows immediately. The first
  message reuses that id (the "pristine active session" rule in
  `use-workbench-runner.ts`), so the placeholder becomes the real conversation.
- **Unfiled section**: sessions with no `workspacePath` (path `__unknown__`) are
  rendered in a separate "No workspace" section at the bottom rather than mixed
  into the workspace list.

## Markdown rendering

`TimelineMarkdown` is the single shared renderer for both Claude and Codex
turns. It uses `react-markdown` + `remark-gfm` (tables, links, task lists);
fenced code blocks get syntax highlighting, a language label and copy button
(`CodeBlock`). Highlighting uses `highlight.js/lib/core` with a **curated** set
of languages (registered in the component) rather than `rehype-highlight`, which
bundles all ~190 languages and exceeds the chunk budget. To add a language,
register it in `timeline-markdown.tsx`. To change markdown rendering app-wide,
edit this one component. The theme is `highlight.js/styles/github-dark.css`
(imported in the component); token colors can be overridden via `.hljs-*`
classes in `apps/desktop/src/styles.css`. The markdown stack is isolated in a
`markdown-vendor` chunk (see `vite.config.ts` + `check-chunk-budget.mjs`).
