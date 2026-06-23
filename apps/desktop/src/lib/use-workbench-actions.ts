import type { Dispatch, SetStateAction } from "react";

import type {
  ApprovalDecision,
  UiI18n,
  WorkbenchApprovalSnapshot,
  WorkbenchEvent,
  WorkbenchRuntimeSnapshot,
  WorkbenchSessionControllerSnapshot,
  WorkbenchSessionDefaults
} from "@geond-agent/ui-workbench";
import {
  buildClaudeCodeApprovalFollowUpPrompt,
  selectClaudeCodeApprovalFollowUpPermissionMode
} from "@geond-agent/claude-code-bridge";

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
      externalSessionId: activeExternalSession.externalSessionId,
      trigger: "manual_resume"
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

    const approval = activeSession.approvals.find((approval) => approval.id === approvalId);
    const approvalTitle = approval?.title ?? approvalId;
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

    const followUpExternalSessionId = activeExternalSession?.externalSessionId;
    if (
      shouldRunApprovalFollowUp(
        activeSession,
        activeExternalSession,
        approval,
        decision,
        runnerBusy,
        runnerMode
      ) &&
      followUpExternalSessionId
    ) {
      setRunnerStatus(
        formatMessage(i18n.t("workbench.approvals.followUpQueued"), {
          decision: formatApprovalDecision(i18n, decision),
          title: approvalTitle
        })
      );
      await startSession("claude-live", {
        resumeSessionId: activeSession.id,
        externalSessionId: followUpExternalSessionId,
        promptOverride: buildClaudeCodeApprovalFollowUpPrompt({ approval, decision }),
        permissionModeOverride: selectClaudeCodeApprovalFollowUpPermissionMode(
          approval,
          decision
        ),
        trigger: "approval_follow_up",
        sourceApprovalId: approval.id
      });
      return;
    }

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
    await document.saveWorkspace(selected);
    setWorkspacePath(selected.path);
  };

  const attachWorkspaceContext = async () => {
    if (!activeSession) {
      return;
    }

    const attachedAt = new Date().toISOString();
    const contextPath =
      workspacePath === "__all__"
        ? activeSession.workspacePath ?? document.activeWorkspace.path
        : workspacePath;
    const title = basename(contextPath);
    const events: readonly WorkbenchEvent[] = [
      {
        type: "context.attached",
        sessionId: activeSession.id,
        attachment: {
          id: `context-workspace-${slugify(contextPath)}-${Date.now()}`,
          kind: "workspace",
          title,
          provenance: "desktop",
          contentState: "metadata-only",
          path: contextPath,
          summary: i18n.t("workbench.context.workspaceSummary"),
          attachedAt
        },
        at: attachedAt
      }
    ];

    await document.eventStore.append(events);
    setControllerSnapshot(
      document.controller.appendEvents(events, { activateSessionId: activeSession.id })
    );
    setRunnerStatus(
      formatMessage(i18n.t("workbench.context.attachedStatus"), {
        title
      })
    );
  };

  const attachFileContext = async () => {
    if (!activeSession) {
      return;
    }

    const selected = await document.chooseFile(
      workspacePath === "__all__"
        ? activeSession.workspacePath ?? document.activeWorkspace.path
        : workspacePath
    );
    if (!selected) {
      return;
    }

    const attachedAt = new Date().toISOString();
    const events: readonly WorkbenchEvent[] = [
      {
        type: "context.attached",
        sessionId: activeSession.id,
        attachment: {
          id: `context-file-${slugify(selected.path)}-${Date.now()}`,
          kind: "file",
          title: selected.label,
          provenance: "desktop",
          contentState: "metadata-only",
          path: selected.path,
          summary: i18n.t("workbench.context.fileSummary"),
          attachedAt
        },
        at: attachedAt
      }
    ];

    await document.eventStore.append(events);
    setControllerSnapshot(
      document.controller.appendEvents(events, { activateSessionId: activeSession.id })
    );
    setRunnerStatus(
      formatMessage(i18n.t("workbench.context.attachedStatus"), {
        title: selected.label
      })
    );
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
    attachFileContext,
    attachWorkspaceContext,
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

function basename(path: string): string {
  const pieces = path.split("/").filter((piece) => piece.length > 0);
  return pieces[pieces.length - 1] ?? path;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "workspace";
}

function shouldRunApprovalFollowUp(
  activeSession: ProjectedActiveSession,
  activeExternalSession: ProjectedActiveSession["externalSessions"][string] | undefined,
  approval: WorkbenchApprovalSnapshot | undefined,
  decision: ApprovalDecision,
  runnerBusy: boolean,
  runnerMode: DesktopRunnerMode
): approval is WorkbenchApprovalSnapshot {
  return Boolean(
    approval &&
      decision === "approved" &&
      runnerMode === "claude-live" &&
      activeExternalSession &&
      !runnerBusy &&
      ["completed", "failed", "paused"].includes(activeSession.lifecycle)
  );
}
