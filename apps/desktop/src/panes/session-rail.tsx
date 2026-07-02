import type { UiI18n } from "@geond-agent/ui-workbench";
import { Settings } from "lucide-react";

import { WorkspaceSessionList } from "../components/workbench/workspace-session-list.js";
import { cn } from "../lib/cn.js";
import type { WorkspaceSessionGroup } from "../lib/workspace-session-groups.js";
import type { ProjectedSessionListItem } from "../lib/workbench-types.js";
import { backendTone, formatStatusLabel } from "../lib/workbench-format.js";
import type { DesktopDemoDocument } from "../demo-workbench.js";

type Projection = DesktopDemoDocument["initialControllerSnapshot"]["projection"];

export function SessionRailPane({
  activeSessionId,
  activeSessionTitle,
  archivedSessions,
  chooseWorkspace,
  i18n,
  onDeleteSession,
  onArchiveSession,
  onOpenSettings,
  onRestoreSession,
  onSelectNativeSession,
  onResumeNativeSession,
  onStartNewChat,
  projection,
  selectSession,
  sessionQuery,
  setSessionQuery,
  setWorkspacePath,
  toggleWorkspaceFavorite,
  workspaceSessionGroups
}: {
  readonly activeSessionId?: string;
  readonly activeSessionTitle?: string;
  readonly archivedSessions: readonly ProjectedSessionListItem[];
  readonly chooseWorkspace: () => void;
  readonly i18n: UiI18n;
  readonly onDeleteSession: (id: string) => void;
  readonly onArchiveSession: (id: string) => void;
  readonly onOpenSettings: () => void;
  readonly onRestoreSession: (id: string) => void;
  readonly onSelectNativeSession?: (source: "claude" | "codex", id: string) => void;
  readonly onResumeNativeSession?: (source: "claude" | "codex", id: string) => void;
  readonly onStartNewChat: (workspacePath?: string) => void;
  readonly projection: Projection;
  readonly selectSession: (sessionId: string) => void;
  readonly sessionQuery: string;
  readonly setSessionQuery: (query: string) => void;
  readonly setWorkspacePath: (path: string) => void;
  readonly toggleWorkspaceFavorite: (path: string, label: string) => void;
  readonly workspaceSessionGroups: readonly WorkspaceSessionGroup[];
}) {
  return (
    <aside className="session-rail">
      <div className="flex items-center justify-between gap-3">
        <h2 className="panel-title">{i18n.t("workbench.sessionSidebar.title")}</h2>
        <div className="flex items-center gap-2">
          <span className="font-mono text-[11px] text-[color:var(--ink-muted)]">
            {projection.sessions.length}
          </span>
          <button
            type="button"
            className="workspace-add-button"
            onClick={onOpenSettings}
            title={i18n.t("workbench.actions.settings")}
            aria-label={i18n.t("workbench.actions.settings")}
          >
            <Settings size={14} />
          </button>
        </div>
      </div>

      <div className="rail-card">
        <label className="muted-meta block" htmlFor="session-search">
          {i18n.t("workbench.sessionSidebar.search")}
        </label>
        <input
          id="session-search"
          value={sessionQuery}
          onChange={(event) => setSessionQuery(event.target.value)}
          className="rail-input mt-2"
          placeholder={activeSessionTitle ?? i18n.t("workbench.timeline.empty")}
        />
      </div>

      <WorkspaceSessionList
        activeSessionId={activeSessionId}
        archivedSessions={archivedSessions}
        chooseWorkspace={chooseWorkspace}
        groups={workspaceSessionGroups}
        i18n={i18n}
        onDeleteSession={onDeleteSession}
        onArchiveSession={onArchiveSession}
        onSelect={selectSession}
        onSelectNativeSession={onSelectNativeSession}
        onResumeNativeSession={onResumeNativeSession}
        onSelectWorkspace={setWorkspacePath}
        onStartNewChat={onStartNewChat}
        onToggleWorkspaceFavorite={toggleWorkspaceFavorite}
        onRestoreSession={onRestoreSession}
      />

      <section className="backend-status-section">
        <h3 className="panel-title">
          {i18n.t("workbench.sessionSidebar.backendStatus")}
        </h3>
        {projection.backendStatuses.map((status) => (
          <div key={status.backendAdapterId} className="rail-card">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold leading-5">{status.label}</p>
                <p className="mt-1 text-xs leading-5 text-[color:var(--ink-soft)]">
                  {status.detail}
                </p>
              </div>
              <span className={cn("status-pill", backendTone[status.level])}>
                {formatStatusLabel(i18n, status.level)}
              </span>
            </div>
          </div>
        ))}
      </section>
    </aside>
  );
}
