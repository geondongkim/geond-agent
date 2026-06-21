import { useMemo } from "react";
import type { WorkbenchSessionDefaults } from "@geond-agent/ui-workbench";

import type { DesktopDemoDocument } from "../demo-workbench.js";
import type { DesktopWorkspaceDescriptor } from "../workspace.js";
import type { ProjectedSessionListItem } from "./workbench-types.js";

type Projection = DesktopDemoDocument["initialControllerSnapshot"]["projection"];

export function useWorkbenchDerivedState({
  pinnedSessionIds,
  projection,
  selectedWorkspaces,
  sessionDefaults,
  sessionQuery,
  workspacePath
}: {
  readonly pinnedSessionIds: readonly string[];
  readonly projection: Projection;
  readonly selectedWorkspaces: readonly DesktopWorkspaceDescriptor[];
  readonly sessionDefaults: WorkbenchSessionDefaults;
  readonly sessionQuery: string;
  readonly workspacePath: string;
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
  const workspaceOptions = useMemo(() => {
    const options = new Map<string, { readonly label: string; readonly path: string }>();
    selectedWorkspaces.forEach((workspace) => options.set(workspace.path, workspace));
    projection.workspaces.forEach((workspace) => options.set(workspace.path, workspace));
    return [...options.values()];
  }, [projection.workspaces, selectedWorkspaces]);
  const visibleSessions = useMemo(
    () =>
      projection.sessions.filter(
        (session) =>
          matchesWorkspaceFilter(session.workspacePath, workspacePath) &&
          matchesSessionQuery(session, sessionQuery)
      ),
    [projection.sessions, sessionQuery, workspacePath]
  );
  const visibleSessionIds = useMemo(
    () => new Set(visibleSessions.map((session) => session.id)),
    [visibleSessions]
  );
  const visiblePinnedSessions = useMemo(
    () => projection.pinnedSessions.filter((session) => visibleSessionIds.has(session.id)),
    [projection.pinnedSessions, visibleSessionIds]
  );
  const visibleRecentSessions = useMemo(
    () => projection.recentSessions.filter((session) => visibleSessionIds.has(session.id)),
    [projection.recentSessions, visibleSessionIds]
  );

  return {
    activeExternalSession,
    activeSession,
    activeSessionListItem,
    activeSessionPinned,
    pendingApprovals,
    visiblePinnedSessions,
    visibleRecentSessions,
    workspaceOptions
  };
}

function getExternalSessionLink(
  session: NonNullable<Projection["activeSession"]>,
  adapterId: string
): NonNullable<Projection["activeSession"]>["externalSessions"][string] | undefined {
  return session.externalSessions[adapterId] ?? Object.values(session.externalSessions)[0];
}

function matchesWorkspaceFilter(
  sessionWorkspacePath: string | undefined,
  workspacePath: string
): boolean {
  return workspacePath === "__all__" || sessionWorkspacePath === workspacePath;
}

function matchesSessionQuery(
  session: ProjectedSessionListItem,
  query: string
): boolean {
  const normalizedQuery = query.trim().toLowerCase();
  if (normalizedQuery.length === 0) {
    return true;
  }

  return [
    session.id,
    session.title,
    session.workspacePath,
    session.backendLabel,
    session.lifecycle
  ]
    .filter((value): value is string => typeof value === "string")
    .some((value) => value.toLowerCase().includes(normalizedQuery));
}
