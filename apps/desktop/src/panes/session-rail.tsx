import type { UiI18n } from "@geond-agent/ui-workbench";

import { Button } from "../components/ui/button.js";
import { SessionList } from "../components/workbench/session-list.js";
import { cn } from "../lib/cn.js";
import type { ProjectedSessionListItem } from "../lib/workbench-types.js";
import { backendTone, formatStatusLabel } from "../lib/workbench-format.js";
import type { DesktopDemoDocument } from "../demo-workbench.js";

type Projection = DesktopDemoDocument["initialControllerSnapshot"]["projection"];

export function SessionRailPane({
  activeSessionId,
  activeSessionTitle,
  chooseWorkspace,
  i18n,
  projection,
  selectSession,
  sessionQuery,
  setSessionQuery,
  setWorkspacePath,
  visiblePinnedSessions,
  visibleRecentSessions,
  workspaceOptions,
  workspacePath
}: {
  readonly activeSessionId?: string;
  readonly activeSessionTitle?: string;
  readonly chooseWorkspace: () => void;
  readonly i18n: UiI18n;
  readonly projection: Projection;
  readonly selectSession: (sessionId: string) => void;
  readonly sessionQuery: string;
  readonly setSessionQuery: (query: string) => void;
  readonly setWorkspacePath: (path: string) => void;
  readonly visiblePinnedSessions: readonly ProjectedSessionListItem[];
  readonly visibleRecentSessions: readonly ProjectedSessionListItem[];
  readonly workspaceOptions: readonly { readonly label: string; readonly path: string }[];
  readonly workspacePath: string;
}) {
  return (
    <aside className="session-rail">
      <div className="flex items-center justify-between">
        <h2 className="panel-title">{i18n.t("workbench.sessionSidebar.title")}</h2>
        <span className="font-mono text-[11px] text-[color:var(--ink-muted)]">
          {projection.sessions.length}
        </span>
      </div>

      <div className="rail-card">
        <label className="muted-meta block" htmlFor="workspace-filter">
          {i18n.t("workbench.sessionSidebar.workspaceSwitcher")}
        </label>
        <select
          id="workspace-filter"
          value={workspacePath}
          onChange={(event) => setWorkspacePath(event.target.value)}
          className="mt-2 h-9 w-full rounded-md border border-[color:var(--border-strong)] bg-[color:var(--panel)] px-3 text-sm outline-none"
        >
          <option value="__all__">{i18n.t("workbench.workspace.all")}</option>
          {workspaceOptions.map((workspace) => (
            <option key={workspace.path} value={workspace.path}>
              {workspace.label}
            </option>
          ))}
        </select>
        <Button
          variant="outline"
          className="mt-2 w-full"
          onClick={() => void chooseWorkspace()}
        >
          {i18n.t("workbench.actions.chooseWorkspace")}
        </Button>
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

      <SessionList
        activeSessionId={activeSessionId}
        title={i18n.t("workbench.sessionSidebar.pinned")}
        sessions={visiblePinnedSessions}
        emptyText={i18n.t("workbench.sessionSidebar.noSessions")}
        i18n={i18n}
        onSelect={selectSession}
      />
      <SessionList
        activeSessionId={activeSessionId}
        title={i18n.t("workbench.sessionSidebar.recent")}
        sessions={visibleRecentSessions}
        emptyText={i18n.t("workbench.sessionSidebar.noSessions")}
        i18n={i18n}
        onSelect={selectSession}
      />

      <section className="mt-auto space-y-2">
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
