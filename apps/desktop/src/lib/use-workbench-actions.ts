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
import { createWorkbenchSessionStartEvents } from "@geond-agent/ui-workbench";
import {
  buildClaudeCodeApprovalFollowUpPrompt,
  selectClaudeCodeApprovalFollowUpPermissionMode
} from "@geond-agent/claude-code-bridge";

import type { DesktopDemoDocument, DesktopRunnerMode } from "../demo-workbench.js";
import type { DesktopWorkspaceDescriptor } from "../workspace.js";
import type { StartWorkbenchSession } from "../runs/use-workbench-runner.js";
import { readNativeSession } from "../native-sessions.js";
import {
  createRecentContextItem,
  mergeRecentContextItem,
  type RecentContextItem
} from "./recent-context.js";
import { formatApprovalDecision, formatMessage } from "./workbench-format.js";
import type { ProjectedActiveSession } from "./workbench-types.js";

export interface UseWorkbenchActionsOptions {
  readonly activeExternalSession?: ProjectedActiveSession["externalSessions"][string];
  readonly activeSession?: ProjectedActiveSession;
  readonly activeSessionPinned: boolean;
  readonly archivedSessionIds: readonly string[];
  readonly document: DesktopDemoDocument;
  readonly i18n: UiI18n;
  readonly pinnedSessionIds: readonly string[];
  readonly runnerBusy: boolean;
  readonly runnerMode: DesktopRunnerMode;
  readonly sessionDefaults: WorkbenchSessionDefaults;
  readonly setArchivedSessionIds: Dispatch<SetStateAction<readonly string[]>>;
  readonly setControllerSnapshot: Dispatch<SetStateAction<WorkbenchSessionControllerSnapshot>>;
  readonly setPinnedSessionIds: Dispatch<SetStateAction<readonly string[]>>;
  readonly setRecentContextItems: Dispatch<SetStateAction<readonly RecentContextItem[]>>;
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
  archivedSessionIds,
  document,
  i18n,
  pinnedSessionIds,
  runnerBusy,
  runnerMode,
  sessionDefaults,
  setArchivedSessionIds,
  setControllerSnapshot,
  setPinnedSessionIds,
  setRecentContextItems,
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

  const createNewChat = (requestedWorkspacePath?: string) => {
    void (async () => {
      // Codex-style: a per-workspace "new chat" creates an empty placeholder
      // session scoped to that workspace and activates it. The first message
      // populates it (see the pristine-session reuse in use-workbench-runner).
      const targetWorkspace =
        requestedWorkspacePath ??
        activeSession?.workspacePath ??
        (workspacePath === "__all__" ? document.activeWorkspace.path : workspacePath);
      const sessionId = `local-session-${Date.now()}`;
      const events: readonly WorkbenchEvent[] = createWorkbenchSessionStartEvents({
        sessionId,
        title: i18n.t("workbench.actions.newChat"),
        workspacePath: targetWorkspace,
        at: new Date().toISOString()
      });
      await document.eventStore.append(events);
      setControllerSnapshot(
        document.controller.appendEvents(events, { activateSessionId: sessionId })
      );
      if (targetWorkspace && targetWorkspace !== "__unknown__") {
        setWorkspacePath(targetWorkspace);
      }
    });
  };

  const rememberRecentContext = (item: RecentContextItem | undefined) => {
    if (!item) {
      return;
    }

    setRecentContextItems((current) => {
      const next = mergeRecentContextItem(current, item);
      void document.saveRecentContextItems(next);
      return next;
    });
  };

  const startSelectedRunner = () => {
    // Chat-like continuation: when the active session has a live backend
    // session linked, a new message resumes that conversation (claude --resume
    // / codex thread) on the SAME session id, instead of minting a new session
    // per message. Use the explicit "new session" action to start fresh.
    if (activeSession && activeExternalSession && !runnerBusy) {
      void startSession(runnerMode, {
        resumeSessionId: activeSession.id,
        externalSessionId: activeExternalSession.externalSessionId,
        trigger: "manual_resume"
      });
      return;
    }
    void startSession(runnerMode);
  };

  const startNewSession = () => {
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

  const retryActiveSession = () => {
    if (!activeSession || runnerBusy) {
      return;
    }

    void startSession(runnerMode, {
      resumeSessionId: activeSession.id,
      externalSessionId: activeExternalSession?.externalSessionId,
      trigger: activeExternalSession ? "manual_resume" : "manual"
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

  const deleteSession = async (sessionId: string) => {
    const nextPinnedSessionIds = pinnedSessionIds.filter(
      (id) => id !== sessionId
    );
    const nextArchivedSessionIds = archivedSessionIds.filter(
      (id) => id !== sessionId
    );
    const [, savedPinnedSessionIds, savedArchivedSessionIds] = await Promise.all([
      document.eventStore.deleteSession(sessionId),
      document.savePinnedSessionIds(nextPinnedSessionIds),
      document.saveArchivedSessionIds(nextArchivedSessionIds)
    ]);

    setPinnedSessionIds(savedPinnedSessionIds);
    setArchivedSessionIds(savedArchivedSessionIds);
    setControllerSnapshot(document.controller.deleteSession(sessionId));
  };

  const deleteActiveSession = async () => {
    if (!activeSession || runnerBusy) {
      return;
    }

    const deletedSession = activeSession;
    await deleteSession(deletedSession.id);
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
    rememberRecentContext(
      createRecentContextItem({
        kind: "workspace",
        label: selected.label,
        path: selected.path
      })
    );
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
    await attachMetadataContext({
      attachedAt,
      kind: "workspace",
      path: contextPath,
      summary: i18n.t("workbench.context.workspaceSummary"),
      title
    });
    rememberRecentContext(
      createRecentContextItem({
        kind: "workspace",
        label: title,
        path: contextPath,
        updatedAt: attachedAt
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
    await attachMetadataContext({
      attachedAt,
      kind: "file",
      path: selected.path,
      summary: i18n.t("workbench.context.fileSummary"),
      title: selected.label
    });
    rememberRecentContext(
      createRecentContextItem({
        kind: "file",
        label: selected.label,
        path: selected.path,
        updatedAt: attachedAt
      })
    );
  };

  const attachRecentContext = async (item: RecentContextItem) => {
    if (!activeSession) {
      return;
    }

    const attachedAt = new Date().toISOString();
    await attachMetadataContext({
      attachedAt,
      kind: item.kind,
      path: item.path,
      summary:
        item.kind === "workspace"
          ? i18n.t("workbench.context.workspaceSummary")
          : i18n.t("workbench.context.fileSummary"),
      title: item.label
    });
    rememberRecentContext({ ...item, updatedAt: attachedAt });
  };

  const attachMetadataContext = async ({
    attachedAt,
    kind,
    path,
    summary,
    title
  }: {
    readonly attachedAt: string;
    readonly kind: RecentContextItem["kind"];
    readonly path: string;
    readonly summary: string;
    readonly title: string;
  }) => {
    if (!activeSession) {
      return;
    }

    const events: readonly WorkbenchEvent[] = [
      {
        type: "context.attached",
        sessionId: activeSession.id,
        attachment: {
          id: `context-${kind}-${slugify(path)}-${Date.now()}`,
          kind,
          title,
          provenance: "desktop",
          contentState: "metadata-only",
          path,
          summary,
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

  const archiveSession = async (sessionId: string) => {
    if (archivedSessionIds.includes(sessionId)) {
      return;
    }

    const nextArchivedSessionIds = [...archivedSessionIds, sessionId];
    const saved = await document.saveArchivedSessionIds(nextArchivedSessionIds);
    setArchivedSessionIds(saved);
  };

  const unarchiveSession = async (sessionId: string) => {
    const nextArchivedSessionIds = archivedSessionIds.filter((id) => id !== sessionId);
    const saved = await document.saveArchivedSessionIds(nextArchivedSessionIds);
    setArchivedSessionIds(saved);
  };

  const selectNativeSession = async (source: "claude" | "codex", id: string) => {
    const targetWorkspace =
      activeSession?.workspacePath ??
      (workspacePath === "__all__" ? document.activeWorkspace.path : workspacePath);

    const events = await readNativeSession(source, id, targetWorkspace);
    const sessionId = `native:${source}:${id}`;

    setControllerSnapshot(document.controller.loadSessionEvents(sessionId, events));
  };

  const resumeNativeSession = async (source: "claude" | "codex", id: string) => {
    const targetWorkspace =
      activeSession?.workspacePath ??
      (workspacePath === "__all__" ? document.activeWorkspace.path : workspacePath);

    const newAppSessionId = `local-session-${Date.now()}`;
    const now = new Date().toISOString();

    // Create session start events
    const startEvents: readonly WorkbenchEvent[] = createWorkbenchSessionStartEvents({
      sessionId: newAppSessionId,
      title: source === "claude" ? "Claude Code Resume" : "Codex Resume",
      workspacePath: targetWorkspace,
      at: now
    });

    // Create adapter linked event
    const adapterLinkedEvent: WorkbenchEvent = {
      type: "session.adapter.linked",
      sessionId: newAppSessionId,
      adapterId: source === "claude" ? "claude-code.external-cli-acp" : "codex.cli.metadata",
      externalSessionId: id,
      at: now
    };

    const allEvents = [...startEvents, adapterLinkedEvent];

    await document.eventStore.append(allEvents);
    setControllerSnapshot(
      document.controller.appendEvents(allEvents, { activateSessionId: newAppSessionId })
    );

    // Start the session with the appropriate runner
    const runnerMode = source === "claude" ? "claude-live" : "codex-live";
    await startSession(runnerMode, {
      resumeSessionId: newAppSessionId,
      externalSessionId: id,
      trigger: "manual_resume"
    });
  };

  return {
    attachFileContext,
    attachRecentContext,
    attachWorkspaceContext,
    archiveSession,
    chooseWorkspace,
    createNewChat,
    deleteActiveSession,
    deleteSession,
    resolveApproval,
    resumeActiveSession,
    resumeNativeSession,
    retryActiveSession,
    selectNativeSession,
    selectSession,
    startNewSession,
    startSelectedRunner,
    togglePinnedSession,
    unarchiveSession,
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
