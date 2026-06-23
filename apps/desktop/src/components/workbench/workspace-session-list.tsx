import type { UiI18n } from "@geond-agent/ui-workbench";
import { Folder, FolderOpen, Plus } from "lucide-react";

import { cn } from "../../lib/cn.js";
import type { WorkspaceSessionGroup } from "../../lib/workspace-session-groups.js";
import { EmptyState } from "./empty-state.js";
import { SessionCard } from "./session-card.js";

export function WorkspaceSessionList({
  activeSessionId,
  chooseWorkspace,
  groups,
  i18n,
  onSelect,
  onSelectWorkspace
}: {
  readonly activeSessionId?: string;
  readonly chooseWorkspace: () => void;
  readonly groups: readonly WorkspaceSessionGroup[];
  readonly i18n: UiI18n;
  readonly onSelect: (sessionId: string) => void;
  readonly onSelectWorkspace: (path: string) => void;
}) {
  return (
    <section className="workspace-session-section">
      <div className="flex items-center justify-between gap-2">
        <h3 className="panel-title">{i18n.t("workbench.sessionSidebar.workspaces")}</h3>
        <button
          type="button"
          className="workspace-add-button"
          onClick={() => void chooseWorkspace()}
          title={i18n.t("workbench.actions.chooseWorkspace")}
          aria-label={i18n.t("workbench.actions.chooseWorkspace")}
        >
          <Plus aria-hidden="true" size={14} strokeWidth={2.4} />
        </button>
      </div>

      <div className="workspace-session-groups">
        {groups.length ? (
          groups.map((group) => (
            <WorkspaceSessionGroupView
              key={group.path}
              activeSessionId={activeSessionId}
              group={group}
              i18n={i18n}
              onSelect={onSelect}
              onSelectWorkspace={onSelectWorkspace}
            />
          ))
        ) : (
          <EmptyState text={i18n.t("workbench.sessionSidebar.noSessions")} />
        )}
      </div>
    </section>
  );
}

function WorkspaceSessionGroupView({
  activeSessionId,
  group,
  i18n,
  onSelect,
  onSelectWorkspace
}: {
  readonly activeSessionId?: string;
  readonly group: WorkspaceSessionGroup;
  readonly i18n: UiI18n;
  readonly onSelect: (sessionId: string) => void;
  readonly onSelectWorkspace: (path: string) => void;
}) {
  const FolderIcon = group.selected ? FolderOpen : Folder;

  return (
    <section
      className={cn(
        "workspace-session-group",
        group.selected ? "workspace-session-group-active" : "workspace-session-group-idle"
      )}
    >
      <button
        type="button"
        className="workspace-session-header"
        onClick={() => onSelectWorkspace(group.path)}
        aria-current={group.selected ? "true" : undefined}
      >
        <span className="workspace-session-folder">
          <FolderIcon aria-hidden="true" size={15} strokeWidth={2.2} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold">{group.label}</span>
          <span className="block truncate text-[11px] text-[color:var(--ink-soft)]">
            {group.path}
          </span>
        </span>
        <span className="workspace-session-count">{group.sessions.length}</span>
      </button>

      <div className="workspace-session-card-list">
        {group.sessions.length ? (
          group.sessions.map((session) => (
            <SessionCard
              key={session.id}
              session={session}
              active={session.id === activeSessionId}
              i18n={i18n}
              onSelect={() => {
                onSelectWorkspace(group.path);
                onSelect(session.id);
              }}
            />
          ))
        ) : (
          <p className="workspace-session-empty">
            {i18n.t("workbench.sessionSidebar.noSessions")}
          </p>
        )}
      </div>
    </section>
  );
}
