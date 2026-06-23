import { useMemo } from "react";
import type { UiI18n, WorkbenchSessionDefaults } from "@geond-agent/ui-workbench";

import type { DesktopDemoDocument } from "../demo-workbench.js";
import type { DesktopWorkspaceDescriptor } from "../workspace.js";
import { createWorkspaceSessionGroups } from "./workspace-session-groups.js";

type Projection = DesktopDemoDocument["initialControllerSnapshot"]["projection"];

export function useWorkbenchDerivedState({
  i18n,
  pinnedSessionIds,
  projection,
  selectedWorkspaces,
  sessionDefaults,
  sessionQuery,
  workspacePath
}: {
  readonly i18n: UiI18n;
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
  const workspaceSessionGroups = useMemo(
    () =>
      createWorkspaceSessionGroups({
        sessions: projection.sessions,
        pinnedSessionIds,
        selectedWorkspacePath: workspacePath,
        sessionQuery,
        unknownWorkspaceLabel: i18n.t("workbench.status.unknown"),
        workspaceOptions
      }),
    [i18n, pinnedSessionIds, projection.sessions, sessionQuery, workspaceOptions, workspacePath]
  );

  return {
    activeExternalSession,
    activeSession,
    activeSessionListItem,
    activeSessionPinned,
    pendingApprovals,
    workspaceSessionGroups,
    workspaceOptions
  };
}

function getExternalSessionLink(
  session: NonNullable<Projection["activeSession"]>,
  adapterId: string
): NonNullable<Projection["activeSession"]>["externalSessions"][string] | undefined {
  return session.externalSessions[adapterId] ?? Object.values(session.externalSessions)[0];
}
