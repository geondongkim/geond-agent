import type { UiI18n } from "@geond-agent/ui-workbench";

import { WorkspaceSessionList } from "../components/workbench/workspace-session-list.js";
import { cn } from "../lib/cn.js";
import type { WorkspaceSessionGroup } from "../lib/workspace-session-groups.js";
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
  toggleWorkspaceFavorite,
  workspaceSessionGroups
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
  readonly toggleWorkspaceFavorite: (path: string, label: string) => void;
  readonly workspaceSessionGroups: readonly WorkspaceSessionGroup[];
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
        chooseWorkspace={chooseWorkspace}
        groups={workspaceSessionGroups}
        i18n={i18n}
        onSelect={selectSession}
        onSelectWorkspace={setWorkspacePath}
        onToggleWorkspaceFavorite={toggleWorkspaceFavorite}
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
