import { useMemo } from "react";
import type { UiI18n, WorkbenchSessionDefaults } from "@geond-agent/ui-workbench";

import type { DesktopDemoDocument } from "../demo-workbench.js";
import type { DesktopWorkspaceDescriptor } from "../workspace.js";
import type { NativeSessionRecord } from "../native-sessions.js";
import type { RecentContextItem } from "./recent-context.js";
import {
  createWorkspaceSessionGroups,
  type WorkspaceSessionOption
} from "./workspace-session-groups.js";

type Projection = DesktopDemoDocument["initialControllerSnapshot"]["projection"];

export function useWorkbenchDerivedState({
  i18n,
  pinnedSessionIds,
  archivedSessionIds,
  projection,
  recentContextItems,
  selectedWorkspaces,
  sessionDefaults,
  sessionQuery,
  workspacePath,
  nativeClaudeSessions,
  nativeCodexSessions
}: {
  readonly i18n: UiI18n;
  readonly pinnedSessionIds: readonly string[];
  readonly archivedSessionIds: readonly string[];
  readonly projection: Projection;
  readonly recentContextItems: readonly RecentContextItem[];
  readonly selectedWorkspaces: readonly DesktopWorkspaceDescriptor[];
  readonly sessionDefaults: WorkbenchSessionDefaults;
  readonly sessionQuery: string;
  readonly workspacePath: string;
  readonly nativeClaudeSessions: readonly NativeSessionRecord[];
  readonly nativeCodexSessions: readonly NativeSessionRecord[];
}) {
  const activeSession = projection.activeSession;
  const pendingApprovals = useMemo(
    () => activeSession?.approvals.filter((approval) => approval.status === "pending") ?? [],
    [activeSession?.approvals]
  );
  const activeSessionPinned = activeSession
    ? pinnedSessionIds.includes(activeSession.id)
    : false;
  const activeSessionListItem = activeSession
    ? projection.sessions.find((session) => session.id === activeSession.id)
    : undefined;
  const activeExternalSession = activeSession
    ? getExternalSessionLink(activeSession, sessionDefaults.defaultBackendAdapterId)
    : undefined;

  // Merge native and app sessions
  const mergedSessions = useMemo(() => {
    // Map app sessions with source tag
    const appWithSource = projection.sessions
      .filter((session) => !archivedSessionIds.includes(session.id))
      .map((session) => ({ ...session, source: "app" as const }));

    // Map native Claude sessions
    const claudeMapped = nativeClaudeSessions.map((rec) => ({
      id: `native:claude:${rec.id}`,
      source: "claude" as const,
      title: rec.title,
      workspacePath: rec.workspacePath,
      updatedAt: rec.updatedAt,
      lifecycle: "completed" as const,
      resumable: true,
      pendingApprovalCount: 0,
      warningCount: 0,
      errorCount: 0
    }));

    // Map native Codex sessions
    const codexMapped = nativeCodexSessions.map((rec) => ({
      id: `native:codex:${rec.id}`,
      source: "codex" as const,
      title: rec.title,
      workspacePath: rec.workspacePath,
      updatedAt: rec.updatedAt,
      lifecycle: "completed" as const,
      resumable: true,
      pendingApprovalCount: 0,
      warningCount: 0,
      errorCount: 0
    }));

    return [...appWithSource, ...claudeMapped, ...codexMapped];
  }, [projection.sessions, archivedSessionIds, nativeClaudeSessions, nativeCodexSessions]);

  const nonArchivedSessions = mergedSessions;

  const archivedSessions = useMemo(
    () => archivedSessionIds
      .map((id) => projection.sessions.find((session) => session.id === id))
      .filter((session): session is NonNullable<typeof projection.sessions[0]> => session !== undefined)
      .sort((a, b) => {
        const aTime = a.updatedAt ? Date.parse(a.updatedAt) : 0;
        const bTime = b.updatedAt ? Date.parse(b.updatedAt) : 0;
        return bTime - aTime;
      }),
    [archivedSessionIds, projection.sessions]
  );
  const workspaceOptions = useMemo(() => {
    const options = new Map<string, WorkspaceSessionOption>();
    const upsertWorkspace = (workspace: WorkspaceSessionOption) => {
      const existing = options.get(workspace.path);
      options.set(workspace.path, {
        ...existing,
        ...workspace,
        favorite: existing?.favorite === true || workspace.favorite === true,
        updatedAt: maxMaybeIso(existing?.updatedAt, workspace.updatedAt)
      });
    };

    selectedWorkspaces.forEach((workspace) => upsertWorkspace(workspace));
    projection.workspaces.forEach((workspace) => upsertWorkspace(workspace));
    recentContextItems
      .filter((item) => item.kind === "workspace")
      .forEach((item) =>
        upsertWorkspace({
          label: item.label,
          path: item.path,
          favorite: item.favorite,
          updatedAt: item.updatedAt
        })
      );
    return [...options.values()];
  }, [projection.workspaces, recentContextItems, selectedWorkspaces]);
  const workspaceSessionGroups = useMemo(
    () =>
      createWorkspaceSessionGroups({
        sessions: nonArchivedSessions,
        pinnedSessionIds,
        selectedWorkspacePath: workspacePath,
        sessionQuery,
        unknownWorkspaceLabel: i18n.t("workbench.status.unknown"),
        workspaceOptions
      }),
    [i18n, pinnedSessionIds, nonArchivedSessions, sessionQuery, workspaceOptions, workspacePath]
  );

  return {
    activeExternalSession,
    activeSession,
    activeSessionListItem,
    activeSessionPinned,
    archivedSessions,
    pendingApprovals,
    workspaceSessionGroups,
    workspaceOptions
  };
}

function maxMaybeIso(
  left: string | undefined,
  right: string | undefined
): string | undefined {
  if (!left) {
    return right;
  }
  if (!right) {
    return left;
  }

  return Date.parse(left) >= Date.parse(right) ? left : right;
}

function getExternalSessionLink(
  session: NonNullable<Projection["activeSession"]>,
  adapterId: string
): NonNullable<Projection["activeSession"]>["externalSessions"][string] | undefined {
  return session.externalSessions[adapterId] ?? Object.values(session.externalSessions)[0];
}
