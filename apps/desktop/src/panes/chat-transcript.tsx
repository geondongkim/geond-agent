import { useEffect, useLayoutEffect, useRef, type FC } from "react";
import type { UiI18n } from "@geond-agent/ui-workbench";
import {
  type ChatActivityEntry,
  type ChatAssistantTurn,
  type ChatTurn,
  type ChatUserTurn
} from "@geond-agent/ui-workbench";

import { TimelineMarkdown } from "../components/workbench/timeline-markdown.js";
import { cn } from "../lib/cn.js";
import { formatTimelineKindLabel } from "../lib/workbench-format.js";

/**
 * Selectable transcript rendering strategy. "compact" is the current codex-level
 * renderer (clean conversational turns, collapsed activity). "bubbles" is the
 * extension point for a future Claude.ai/ChatGPT-style bubble layout — it maps
 * to the compact view until a dedicated BubbleTranscriptView is implemented.
 * See docs/desktop-transcript-architecture.md for how to add a variant.
 */
export type TranscriptVariant = "compact" | "bubbles";

export interface ChatTranscriptProps {
  readonly turns: readonly ChatTurn[];
  readonly i18n: UiI18n;
  readonly variant?: TranscriptVariant;
  /** Session id; when it changes the view resets and sticks to the bottom. */
  readonly sessionKey?: string;
  readonly emptyText?: string;
}

export interface TranscriptViewProps {
  readonly turns: readonly ChatTurn[];
  readonly i18n: UiI18n;
}

const transcriptViews: Record<TranscriptVariant, FC<TranscriptViewProps>> = {
  compact: CompactTranscriptView,
  // Placeholder: swap for BubbleTranscriptView when implementing variant "bubbles".
  bubbles: CompactTranscriptView
};

export function ChatTranscript({
  turns,
  i18n,
  variant = "compact",
  sessionKey,
  emptyText
}: ChatTranscriptProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const stickToBottomRef = useRef(true);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) {
      return;
    }
    stickToBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 96;
  };

  // Force-stick to the bottom whenever the active session changes (covers
  // "return to a session" — the previous bug where scroll stayed at the top).
  useEffect(() => {
    stickToBottomRef.current = true;
    const el = scrollRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [sessionKey]);

  // Follow new content while the user is parked at the bottom.
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (el && stickToBottomRef.current) {
      el.scrollTop = el.scrollHeight;
    }
  }, [turns]);

  const View = transcriptViews[variant];

  return (
    <div className="chat-transcript-scroll" ref={scrollRef} onScroll={handleScroll}>
      {turns.length ? (
        <View turns={turns} i18n={i18n} />
      ) : (
        <p className="chat-transcript-empty">{emptyText ?? i18n.t("workbench.timeline.empty")}</p>
      )}
    </div>
  );
}

function CompactTranscriptView({ turns, i18n }: TranscriptViewProps) {
  return (
    <div className="chat-transcript">
      {turns.map((turn) =>
        turn.kind === "user" ? (
          <UserTurnCard key={`user:${turn.id}`} turn={turn} />
        ) : (
          <AssistantTurnCard key={`assistant:${turn.id}`} turn={turn} i18n={i18n} />
        )
      )}
    </div>
  );
}

function UserTurnCard({ turn }: { readonly turn: ChatUserTurn }) {
  return (
    <article className="chat-turn chat-turn-user">
      <div className="chat-turn-author">{/* label handled visually */}</div>
      <div className="chat-turn-body">
        <p className="chat-user-text">{turn.text}</p>
      </div>
    </article>
  );
}

function AssistantTurnCard({
  turn,
  i18n
}: {
  readonly turn: ChatAssistantTurn;
  readonly i18n: UiI18n;
}) {
  return (
    <article className="chat-turn chat-turn-assistant">
      <div className="chat-turn-body">
        {turn.messages.map((message) => (
          <div className="chat-assistant-message" key={message.messageId}>
            {message.text ? <TimelineMarkdown text={message.text} /> : null}
            {message.streaming ? <span className="streaming-cursor" aria-hidden="true" /> : null}
          </div>
        ))}
        {turn.activity.length ? <ActivityGroup activity={turn.activity} i18n={i18n} /> : null}
      </div>
    </article>
  );
}

function ActivityGroup({
  activity,
  i18n
}: {
  readonly activity: readonly ChatActivityEntry[];
  readonly i18n: UiI18n;
}) {
  return (
    <details className="chat-activity-group">
      <summary className="chat-activity-summary">
        {formatMessageCount(i18n, activity.length)}
      </summary>
      <ul className="chat-activity-list">
        {activity.map((entry) => (
          <li key={entry.id} className={cn("chat-activity-item", `chat-activity-${entry.kind}`)}>
            <span className="chat-activity-kind">
              {formatTimelineKindLabel(i18n, entry.kind)}
            </span>
            <span className="chat-activity-title">{entry.title}</span>
            {entry.body ? <pre className="chat-activity-body">{entry.body}</pre> : null}
          </li>
        ))}
      </ul>
    </details>
  );
}

function formatMessageCount(i18n: UiI18n, count: number): string {
  return i18n.t("workbench.chat.activityCount").replace("{count}", String(count));
}
