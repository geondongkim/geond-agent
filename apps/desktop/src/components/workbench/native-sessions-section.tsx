import type { UiI18n } from "@geond-agent/ui-workbench";
import { ChevronDown, ChevronUp, RefreshCw } from "lucide-react";
import { useState } from "react";

import { Button } from "../ui/button.js";
import { cn } from "../../lib/cn.js";
import type { NativeSessionRecord } from "../../native-sessions.js";

interface NativeSessionsSectionProps {
  readonly nativeClaudeSessions: readonly NativeSessionRecord[];
  readonly nativeCodexSessions: readonly NativeSessionRecord[];
  readonly i18n: UiI18n;
  readonly onSelectNativeSession: (source: "claude" | "codex", id: string) => void;
  readonly onResumeNativeSession: (source: "claude" | "codex", id: string) => void;
  readonly onRefreshNativeSessions: () => void;
}

export function NativeSessionsSection({
  nativeClaudeSessions,
  nativeCodexSessions,
  i18n,
  onSelectNativeSession,
  onResumeNativeSession,
  onRefreshNativeSessions
}: NativeSessionsSectionProps) {
  const [claudeExpanded, setClaudeExpanded] = useState(true);
  const [codexExpanded, setCodexExpanded] = useState(true);

  const hasClaudeSessions = nativeClaudeSessions.length > 0;
  const hasCodexSessions = nativeCodexSessions.length > 0;

  if (!hasClaudeSessions && !hasCodexSessions) {
    return null;
  }

  const formatRelativeTime = (timestamp?: string): string => {
    if (!timestamp) {
      return i18n.t("workbench.status.unknown");
    }

    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) {
      return i18n.t("workbench.status.ready");
    } else if (diffMins < 60) {
      return `${diffMins}m`;
    } else if (diffHours < 24) {
      return `${diffHours}h`;
    } else {
      return `${diffDays}d`;
    }
  };

  return (
    <section className="native-sessions-section">
      <div className="flex items-center justify-between gap-2">
        <h3 className="panel-title">{i18n.t("workbench.sessionSidebar.nativeSessions")}</h3>
        <Button
          variant="ghost"
          className="workspace-add-button h-7 w-7"
          onClick={onRefreshNativeSessions}
          title={i18n.t("workbench.actions.refreshNativeSessions")}
          aria-label={i18n.t("workbench.actions.refreshNativeSessions")}
        >
          <RefreshCw size={14} strokeWidth={2.4} />
        </Button>
      </div>

      <div className="space-y-2">
        {hasClaudeSessions ? (
          <details className="native-session-source-group" open={claudeExpanded}>
            <summary
              className="native-session-source-header"
              onClick={(e) => {
                e.preventDefault();
                setClaudeExpanded(!claudeExpanded);
              }}
            >
              <div className="flex items-center justify-between gap-2 w-full">
                <span className="text-sm font-semibold">
                  {i18n.t("workbench.sessionSidebar.nativeClaude")}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[color:var(--ink-muted)]">
                    {nativeClaudeSessions.length}
                  </span>
                  {claudeExpanded ? (
                    <ChevronUp size={14} strokeWidth={2.2} />
                  ) : (
                    <ChevronDown size={14} strokeWidth={2.2} />
                  )}
                </div>
              </div>
            </summary>
            <div className="native-session-list mt-1.5 space-y-1.5">
              {nativeClaudeSessions.map((session) => (
                <NativeSessionRow
                  key={session.id}
                  session={session}
                  source="claude"
                  i18n={i18n}
                  formatRelativeTime={formatRelativeTime}
                  onSelect={() => onSelectNativeSession("claude", session.id)}
                  onResume={() => onResumeNativeSession("claude", session.id)}
                />
              ))}
            </div>
          </details>
        ) : null}

        {hasCodexSessions ? (
          <details className="native-session-source-group" open={codexExpanded}>
            <summary
              className="native-session-source-header"
              onClick={(e) => {
                e.preventDefault();
                setCodexExpanded(!codexExpanded);
              }}
            >
              <div className="flex items-center justify-between gap-2 w-full">
                <span className="text-sm font-semibold">
                  {i18n.t("workbench.sessionSidebar.nativeCodex")}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[color:var(--ink-muted)]">
                    {nativeCodexSessions.length}
                  </span>
                  {codexExpanded ? (
                    <ChevronUp size={14} strokeWidth={2.2} />
                  ) : (
                    <ChevronDown size={14} strokeWidth={2.2} />
                  )}
                </div>
              </div>
            </summary>
            <div className="native-session-list mt-1.5 space-y-1.5">
              {nativeCodexSessions.map((session) => (
                <NativeSessionRow
                  key={session.id}
                  session={session}
                  source="codex"
                  i18n={i18n}
                  formatRelativeTime={formatRelativeTime}
                  onSelect={() => onSelectNativeSession("codex", session.id)}
                  onResume={() => onResumeNativeSession("codex", session.id)}
                />
              ))}
            </div>
          </details>
        ) : null}
      </div>
    </section>
  );
}

interface NativeSessionRowProps {
  readonly session: NativeSessionRecord;
  readonly source: "claude" | "codex";
  readonly i18n: UiI18n;
  readonly formatRelativeTime: (timestamp?: string) => string;
  readonly onSelect: () => void;
  readonly onResume: () => void;
}

function NativeSessionRow({
  session,
  source,
  i18n,
  formatRelativeTime,
  onSelect,
  onResume
}: NativeSessionRowProps) {
  return (
    <div className="native-session-row">
      <button
        type="button"
        onClick={onSelect}
        className="native-session-card"
      >
        <div className="flex min-w-0 items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="native-session-source-badge">
                {source === "claude" ? "Claude" : "Codex"}
              </span>
              <p className="truncate text-sm font-semibold leading-5">{session.title}</p>
            </div>
            <div className="mt-1 flex items-center gap-3 text-xs text-[color:var(--ink-soft)]">
              <span className="native-session-meta">
                {formatRelativeTime(session.updatedAt)}
              </span>
              <span className="native-session-meta">
                {session.messageCount} {session.messageCount === 1 ? "message" : "messages"}
              </span>
            </div>
          </div>
        </div>
      </button>
      <button
        type="button"
        className="native-session-resume-button"
        onClick={onResume}
        title={i18n.t("workbench.actions.continueNativeSession")}
        aria-label={i18n.t("workbench.actions.continueNativeSession")}
      >
        {i18n.t("workbench.actions.continueNativeSession")}
      </button>
    </div>
  );
}