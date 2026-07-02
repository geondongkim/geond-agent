import { useState } from "react";
import type { UiI18n } from "@geond-agent/ui-workbench";

import { ContextMenu, type ContextMenuItem } from "../ui/context-menu.js";
import { cn } from "../../lib/cn.js";
import type { ProjectedSessionListItem } from "../../lib/workbench-types.js";

export function SessionCard({
  active,
  archived,
  i18n,
  onDelete,
  onArchive,
  onRestore,
  onResume,
  onSelect,
  session
}: {
  readonly active: boolean;
  readonly archived?: boolean;
  readonly i18n: UiI18n;
  readonly onDelete?: () => void;
  readonly onArchive?: () => void;
  readonly onRestore?: () => void;
  readonly onResume?: () => void;
  readonly onSelect: () => void;
  readonly session: ProjectedSessionListItem;
}) {
  const source = session.source ?? "app";
  const isNative = source !== "app";
  const [menuAt, setMenuAt] = useState<{ readonly x: number; readonly y: number } | null>(null);

  const items: readonly ContextMenuItem[] = buildMenuItems({
    archived: Boolean(archived),
    isNative,
    i18n,
    onDelete,
    onArchive,
    onRestore,
    onResume
  });

  return (
    <div
      className="session-card-row"
      onContextMenu={(event) => {
        if (items.length > 0) {
          event.preventDefault();
          setMenuAt({ x: event.clientX, y: event.clientY });
        }
      }}
    >
      <button
        type="button"
        onClick={onSelect}
        aria-label={session.title}
        className={cn("session-card", active ? "session-card-active" : "session-card-idle")}
      >
        {isNative ? (
          <span className="session-source-badge" aria-hidden="true">
            {source === "claude" ? "Claude" : "Codex"}
          </span>
        ) : null}
        <span className="session-card-title">{session.title}</span>
        {session.updatedAt ? (
          <span className="session-card-time" aria-hidden="true">
            {formatRelativeTime(session.updatedAt)}
          </span>
        ) : null}
      </button>
      <ContextMenu
        open={menuAt !== null}
        x={menuAt?.x ?? 0}
        y={menuAt?.y ?? 0}
        items={items}
        onClose={() => setMenuAt(null)}
      />
    </div>
  );
}

function buildMenuItems({
  archived,
  isNative,
  i18n,
  onDelete,
  onArchive,
  onRestore,
  onResume
}: {
  readonly archived: boolean;
  readonly isNative: boolean;
  readonly i18n: UiI18n;
  readonly onDelete?: () => void;
  readonly onArchive?: () => void;
  readonly onRestore?: () => void;
  readonly onResume?: () => void;
}): readonly ContextMenuItem[] {
  const items: ContextMenuItem[] = [];
  if (isNative) {
    if (onResume) {
      items.push({
        key: "resume",
        label: i18n.t("workbench.actions.continueNativeSession"),
        onSelect: onResume
      });
    }
    return items;
  }

  if (archived) {
    if (onRestore) {
      items.push({
        key: "restore",
        label: i18n.t("workbench.actions.unarchive"),
        onSelect: onRestore
      });
    }
  } else if (onArchive) {
    items.push({
      key: "archive",
      label: i18n.t("workbench.actions.archive"),
      onSelect: onArchive
    });
  }

  if (onDelete) {
    items.push({
      key: "delete",
      label: i18n.t("workbench.actions.deleteSession"),
      onSelect: onDelete,
      danger: true
    });
  }
  return items;
}

function formatRelativeTime(iso: string): string {
  const at = Date.parse(iso);
  if (Number.isNaN(at)) {
    return "";
  }
  const minutes = Math.floor((Date.now() - at) / 60_000);
  if (minutes < 1) {
    return "now";
  }
  if (minutes < 60) {
    return `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h`;
  }
  const days = Math.floor(hours / 24);
  if (days < 30) {
    return `${days}d`;
  }
  const months = Math.floor(days / 30);
  if (months < 12) {
    return `${months}mo`;
  }
  return `${Math.floor(months / 12)}y`;
}
