import type { Dispatch, SetStateAction } from "react";

import type {
  ApprovalDecision,
  UiI18n,
  WorkbenchEvent,
  WorkbenchRuntimeSnapshot,
  WorkbenchSessionControllerSnapshot,
  WorkbenchSessionDefaults
} from "@geond-agent/ui-workbench";

import type { DesktopDemoDocument, DesktopRunnerMode } from "../demo-workbench.js";
import type { DesktopWorkspaceDescriptor } from "../workspace.js";
import type { StartWorkbenchSession } from "../runs/use-workbench-runner.js";
import { formatApprovalDecision, formatMessage } from "./workbench-format.js";
import type { ProjectedActiveSession } from "./workbench-types.js";

export interface UseWorkbenchActionsOptions {
  readonly activeExternalSession?: ProjectedActiveSession["externalSessions"][string];
  readonly activeSession?: ProjectedActiveSession;
  readonly activeSessionPinned: boolean;
  readonly document: DesktopDemoDocument;
  readonly i18n: UiI18n;
  readonly pinnedSessionIds: readonly string[];
  readonly runnerBusy: boolean;
  readonly runnerMode: DesktopRunnerMode;
  readonly sessionDefaults: WorkbenchSessionDefaults;
  readonly setControllerSnapshot: Dispatch<SetStateAction<WorkbenchSessionControllerSnapshot>>;
  readonly setPinnedSessionIds: Dispatch<SetStateAction<readonly string[]>>;
  readonly setRunnerStatus: (status: string) => void;
  readonly setRuntimeSnapshot: Dispatch<SetStateAction<WorkbenchRuntimeSnapshot>>;
  readonly setSelectedWorkspaces: Dispatch<SetStateAction<readonly DesktopWorkspaceDescriptor[]>>;
  readonly setSessionDefaults: Dispatch<SetStateAction<WorkbenchSessionDefaults>>;
  readonly setWorkspacePath: Dispatch<SetStateAction<string>>;
  readonly startSession: StartWorkbenchSession;
  readonly workspacePath: string;
}

export function useWorkbenchActions({
  activeExternalSession,
  activeSession,
  activeSessionPinned,
  document,
  i18n,
  pinnedSessionIds,
  runnerBusy,
  runnerMode,
  sessionDefaults,
  setControllerSnapshot,
  setPinnedSessionIds,
  setRunnerStatus,
  setRuntimeSnapshot,
  setSelectedWorkspaces,
  setSessionDefaults,
  setWorkspacePath,
  startSession,
  workspacePath
}: UseWorkbenchActionsOptions) {
  const selectSession = (sessionId: string) => {
    void (async () => {
      const events = await document.eventStore.list(sessionId);
      setControllerSnapshot(document.controller.loadSessionEvents(sessionId, events));
    })();
  };

  const startSelectedRunner = () => {
    void startSession(runnerMode);
  };

  const resumeActiveSession = () => {
    if (!activeSession || !activeExternalSession) {
      return;
    }

    void startSession("claude-live", {
      resumeSessionId: activeSession.id,
      externalSessionId: activeExternalSession.externalSessionId
    });
  };

  const togglePinnedSession = async () => {
    if (!activeSession) {
      return;
    }

    const nextPinnedSessionIds = activeSessionPinned
      ? pinnedSessionIds.filter((sessionId) => sessionId !== activeSession.id)
      : [...pinnedSessionIds, activeSession.id];
    const savedPinnedSessionIds = await document.savePinnedSessionIds(nextPinnedSessionIds);

    setPinnedSessionIds(savedPinnedSessionIds);
    setControllerSnapshot(document.controller.setPinnedSessionIds(savedPinnedSessionIds));
  };

  const deleteActiveSession = async () => {
    if (!activeSession || runnerBusy) {
      return;
    }

    const deletedSession = activeSession;
    const nextPinnedSessionIds = pinnedSessionIds.filter(
      (sessionId) => sessionId !== deletedSession.id
    );
    const [, savedPinnedSessionIds] = await Promise.all([
      document.eventStore.deleteSession(deletedSession.id),
      document.savePinnedSessionIds(nextPinnedSessionIds)
    ]);

    setPinnedSessionIds(savedPinnedSessionIds);
    setControllerSnapshot(document.controller.deleteSession(deletedSession.id));
    setRunnerStatus(
      formatMessage(i18n.t("workbench.session.deleted"), {
        title: deletedSession.title
      })
    );
  };

  const resolveApproval = async (
    approvalId: string,
    decision: ApprovalDecision
  ) => {
    if (!activeSession) {
      return;
    }

    const approvalTitle =
      activeSession.approvals.find((approval) => approval.id === approvalId)?.title ?? approvalId;
    const events: readonly WorkbenchEvent[] = [
      {
        type: "approval.resolved",
        sessionId: activeSession.id,
        approvalId,
        decision,
        at: new Date().toISOString()
      }
    ];

    await document.eventStore.append(events);
    setControllerSnapshot(
      document.controller.appendEvents(events, { activateSessionId: activeSession.id })
    );
    setRunnerStatus(
      formatMessage(i18n.t("workbench.approvals.resolved"), {
        decision: formatApprovalDecision(i18n, decision),
        title: approvalTitle
      })
    );
  };

  const chooseWorkspace = async () => {
    const selected = await document.chooseWorkspace(
      workspacePath === "__all__" ? document.activeWorkspace.path : workspacePath
    );
    if (!selected) {
      return;
    }

    setSelectedWorkspaces((current) => {
      const next = new Map(current.map((workspace) => [workspace.path, workspace]));
      next.set(selected.path, selected);
      return [...next.values()];
    });
    setWorkspacePath(selected.path);
  };

  const updateUiLanguage = async (language: string) => {
    const nextSnapshot = await document.runtime.setUiLanguage(language);
    setRuntimeSnapshot(nextSnapshot);
  };

  const updateAgentResponseLanguage = async (language: string) => {
    const nextSnapshot = await document.runtime.setAgentResponseLanguage(language);
    setRuntimeSnapshot(nextSnapshot);
  };

  const updateSessionDefaults = async (patch: Partial<WorkbenchSessionDefaults>) => {
    const nextDefaults = await document.saveSessionDefaults({
      ...sessionDefaults,
      ...patch
    });
    setSessionDefaults(nextDefaults);
  };

  return {
    chooseWorkspace,
    deleteActiveSession,
    resolveApproval,
    resumeActiveSession,
    selectSession,
    startSelectedRunner,
    togglePinnedSession,
    updateAgentResponseLanguage,
    updateSessionDefaults,
    updateUiLanguage
  };
}
