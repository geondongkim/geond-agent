import type { UiI18n } from "@geond-agent/ui-workbench";
import { Archive, ArchiveRestore, Trash2 } from "lucide-react";

import { cn } from "../../lib/cn.js";
import type { ProjectedSessionListItem } from "../../lib/workbench-types.js";
import { formatStatusLabel, lifecycleTone } from "../../lib/workbench-format.js";
import { AgentBackendIcon } from "./agent-backend-icon.js";

export function SessionCard({
  active,
  archived,
  i18n,
  onDelete,
  onArchive,
  onRestore,
  onSelect,
  session,
  showNativeActions
}: {
  readonly active: boolean;
  readonly archived?: boolean;
  readonly i18n: UiI18n;
  readonly onDelete?: () => void;
  readonly onArchive?: () => void;
  readonly onRestore?: () => void;
  readonly onSelect: () => void;
  readonly session: ProjectedSessionListItem;
  readonly showNativeActions?: boolean;
}) {
  const source = session.source ?? "app";
  const isNative = source !== "app";

  return (
    <div className="session-card-row group">
      <button
        type="button"
        onClick={onSelect}
        className={cn(
          "session-card",
          active ? "session-card-active" : "session-card-idle"
        )}
      >
        <div className="grid min-w-0 grid-cols-[28px_minmax(0,1fr)_auto] items-start gap-2">
          <AgentBackendIcon
            backendAdapterId={session.backendAdapterId}
            backendLabel={session.backendLabel}
          />
          <div className="min-w-0 space-y-1">
            <div className="flex items-center gap-2">
              <p className="truncate text-sm font-semibold leading-5">{session.title}</p>
              {isNative && (
                <span className="session-source-badge">
                  {source === "claude" ? "Claude" : "Codex"}
                </span>
              )}
            </div>
            <p className="truncate text-xs leading-5 text-[color:var(--ink-soft)]">
              {session.backendLabel ?? i18n.t("workbench.status.unknown")}
            </p>
          </div>
          <span className={cn("status-pill shrink-0", lifecycleTone[session.lifecycle])}>
            {formatStatusLabel(i18n, session.lifecycle)}
          </span>
        </div>
        {session.resumable ? (
          <div className="mt-2 flex justify-end pl-9">
            <span className="status-pill status-neutral">
              {i18n.t("workbench.actions.resumeSession")}
            </span>
          </div>
        ) : null}
        <div className="mt-3 grid grid-cols-[minmax(0,1fr)_minmax(46px,auto)] gap-2 pl-9 text-[11px] text-[color:var(--ink-soft)]">
          <div className="min-w-0">
            <p className="muted-meta">{i18n.t("workbench.sessionSidebar.workspace")}</p>
            <p className="mt-1 truncate">{session.workspacePath ?? i18n.t("workbench.status.unknown")}</p>
          </div>
          <div className="min-w-[46px] text-right">
            <p className="muted-meta">{i18n.t("workbench.status.approvals")}</p>
            <p className="mt-1">{session.pendingApprovalCount}</p>
          </div>
        </div>
      </button>
      {!isNative && (onDelete || onArchive || onRestore) ? (
        <div className="session-card-actions">
          {archived ? (
            <>
              {onRestore ? (
                <button
                  type="button"
                  className="workspace-favorite-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRestore();
                  }}
                  title={i18n.t("workbench.actions.unarchive")}
                  aria-label={i18n.t("workbench.actions.unarchive")}
                >
                  <ArchiveRestore size={13} strokeWidth={2.2} />
                </button>
              ) : null}
              {onDelete ? (
                <button
                  type="button"
                  className="workspace-favorite-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete();
                  }}
                  title={i18n.t("workbench.actions.deleteSession")}
                  aria-label={i18n.t("workbench.actions.deleteSession")}
                >
                  <Trash2 size={13} strokeWidth={2.2} />
                </button>
              ) : null}
            </>
          ) : (
            <>
              {onArchive ? (
                <button
                  type="button"
                  className="workspace-favorite-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onArchive();
                  }}
                  title={i18n.t("workbench.actions.archive")}
                  aria-label={i18n.t("workbench.actions.archive")}
                >
                  <Archive size={13} strokeWidth={2.2} />
                </button>
              ) : null}
              {onDelete ? (
                <button
                  type="button"
                  className="workspace-favorite-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete();
                  }}
                  title={i18n.t("workbench.actions.deleteSession")}
                  aria-label={i18n.t("workbench.actions.deleteSession")}
                >
                  <Trash2 size={13} strokeWidth={2.2} />
                </button>
              ) : null}
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
