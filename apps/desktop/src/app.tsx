import { useEffect, useMemo, useState } from "react";

import { listen } from "@tauri-apps/api/event";
import {
  type WorkbenchRuntimeSnapshot,
  type WorkbenchSessionDefaults
} from "@geond-agent/ui-workbench";

import type {
  DesktopDemoDocument,
  DesktopRunnerMode,
  DesktopWorkbenchLayoutPreference
} from "./demo-workbench.js";
import { CommandPalette, type CommandPaletteAction } from "./components/workbench/command-palette.js";
import { WorkbenchErrorBoundary } from "./components/workbench/workbench-error-boundary.js";
import { AppBar } from "./panes/app-bar.js";
import { InspectorPane } from "./panes/inspector.js";
import { SessionRailPane } from "./panes/session-rail.js";
import { SettingsPanel } from "./panes/settings-panel.js";
import { TimelinePane } from "./panes/timeline.js";
import { listNativeSessions, type NativeSessionRecord } from "./native-sessions.js";
import {
  createInspectorEvidenceSignature,
  createMaterializedInspectorSessionReadModel,
  createProjectionInspectorSessionReadModel,
  type InspectorSessionReadModel
} from "./lib/inspector-read-model.js";
import { useWorkbenchActions } from "./lib/use-workbench-actions.js";
import { useWorkbenchDerivedState } from "./lib/use-workbench-derived-state.js";
import { useWorkbenchOptions } from "./lib/use-workbench-options.js";
import { useWorkbenchRunner } from "./runs/use-workbench-runner.js";
import {
  createSideChatDraft,
  filterSideChatDraftsForSession,
  normalizeSideChatDrafts,
  type SideChatDraft
} from "./lib/side-chat-drafts.js";
import { formatRunnerModeLabel } from "./lib/workbench-format.js";
import {
  toggleRecentContextPathFavorite,
  toggleRecentContextItemFavorite,
  type RecentContextItem
} from "./lib/recent-context.js";
import {
  normalizeEvidenceExportPreferences,
  type EvidenceExportPreferences
} from "./lib/evidence-export-preferences.js";

interface AppProps {
  readonly document: DesktopDemoDocument;
}

export function App({ document }: AppProps) {
  const [controllerSnapshot, setControllerSnapshot] = useState(
    document.initialControllerSnapshot
  );
  const [runtimeSnapshot, setRuntimeSnapshot] = useState<WorkbenchRuntimeSnapshot>(
    document.runtime.getSnapshot()
  );
  const [sessionDefaults, setSessionDefaults] = useState(document.sessionDefaults);
  const [workspacePath, setWorkspacePath] = useState(
    document.activeWorkspace.path
  );
  const [selectedWorkspaces, setSelectedWorkspaces] = useState(document.workspaces);
  const [pinnedSessionIds, setPinnedSessionIds] = useState(document.pinnedSessionIds);
  const [archivedSessionIds, setArchivedSessionIds] = useState(document.archivedSessionIds);
  const [sessionQuery, setSessionQuery] = useState("");
  const [layoutPreference, setLayoutPreference] = useState(document.layoutPreference);
  const [runnerMode, setRunnerMode] = useState<DesktopRunnerMode>(document.runnerMode);
  const [ignoredRecordCount, setIgnoredRecordCount] = useState(document.ignoredRecordCount);
  const [composerPrompt, setComposerPrompt] = useState("");
  const [sideChatDrafts, setSideChatDrafts] = useState<readonly SideChatDraft[]>(
    document.sideChatDrafts
  );
  const [recentContextItems, setRecentContextItems] = useState<readonly RecentContextItem[]>(
    document.recentContextItems
  );
  const [evidenceExportPreferences, setEvidenceExportPreferences] =
    useState<EvidenceExportPreferences>(document.evidenceExportPreferences);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [settingsPanelOpen, setSettingsPanelOpen] = useState(false);
  const [nativeClaudeSessions, setNativeClaudeSessions] = useState<readonly NativeSessionRecord[]>([]);
  const [nativeCodexSessions, setNativeCodexSessions] = useState<readonly NativeSessionRecord[]>([]);
  const [nativeSessionsRefreshKey, setNativeSessionsRefreshKey] = useState(0);
  const [materializedInspectorData, setMaterializedInspectorData] = useState<
    InspectorSessionReadModel | undefined
  >(() => createProjectionInspectorSessionReadModel(document.initialControllerSnapshot.projection.activeSession));

  const i18n = runtimeSnapshot.i18n;
  const { inspectorTab, leftPanelOpen, rightPanelOpen } = layoutPreference;
  const {
    agentLanguageOptions,
    backendOptions,
    composerEnterBehaviorOptions,
    followUpPolicyOptions,
    modelAliasOptions,
    permissionModeOptions,
    providerRouteOptions,
    reviewDeliveryOptions,
    routingModeOptions,
    settingsLabels
  } = useWorkbenchOptions(i18n, document.selectionCatalog);
  const projection = controllerSnapshot.projection;
  const {
    activeExternalSession,
    activeSession,
    activeSessionListItem,
    activeSessionPinned,
    archivedSessions,
    pendingApprovals,
    workspaceSessionGroups,
    workspaceOptions
  } = useWorkbenchDerivedState({
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
  });
  const inspectorEvidenceSignature = useMemo(
    () => createInspectorEvidenceSignature(activeSession),
    [activeSession]
  );
  const inspectorData =
    materializedInspectorData?.sessionId === activeSession?.id
      ? materializedInspectorData
      : createProjectionInspectorSessionReadModel(activeSession);
  const {
    activeRunMode,
    cancelActiveRun,
    runnerBusy,
    runnerStatus,
    setRunnerStatus,
    startSession
  } = useWorkbenchRunner({
    composerPrompt,
    controllerSnapshot,
    document,
    i18n,
    projectionSessions: projection.sessions,
    runtimeSnapshot,
    sessionDefaults,
    selectionCatalog: document.selectionCatalog,
    setControllerSnapshot,
    setIgnoredRecordCount,
    workspacePath
  });
  const canResumeActiveSession = Boolean(
    activeSessionListItem?.resumable && activeExternalSession && !runnerBusy
  );
  const canFollowUpApprovals = canResumeActiveSession && runnerMode === "claude-live";

  // Check if active session is a native read-only view
  const activeIsNative = activeSession?.id?.startsWith("native:") ?? false;
  const activeNativeSource = activeIsNative ? activeSession?.id?.split(":")[1] as "claude" | "codex" : undefined;
  const activeNativeId = activeIsNative ? activeSession?.id?.split(":")[2] : undefined;

  const resumeActiveNativeSession = () => {
    if (!activeNativeSource || !activeNativeId) {
      return;
    }
    void resumeNativeSession(activeNativeSource, activeNativeId);
  };

  const refreshNativeSessions = () => {
    setNativeSessionsRefreshKey((key) => key + 1);
  };
  const visibleSideChatDrafts = useMemo(
    () => filterSideChatDraftsForSession(sideChatDrafts, activeSession?.id),
    [activeSession?.id, sideChatDrafts]
  );
  const selectWorkspacePath = (path: string) => {
    setWorkspacePath(path);
    if (path !== "__all__") {
      const workspace = workspaceOptions.find((workspace) => workspace.path === path);
      if (workspace) {
        void document.saveWorkspace({
          id: workspace.path,
          label: workspace.label,
          path: workspace.path
        });
      }
    }
  };
  const updateRunnerMode = async (mode: DesktopRunnerMode) => {
    const savedMode = await document.saveRunnerMode(mode);
    setRunnerMode(savedMode);
  };
  const enqueueSideChatDraft = (text: string, sourceLabel?: string) => {
    const draft = createSideChatDraft(text, sourceLabel, {
      sessionId: activeSession?.id
    });
    if (!draft) {
      return;
    }

    setSideChatDrafts((current) => {
      const next = normalizeSideChatDrafts([...current, draft]);
      void document.saveSideChatDrafts(next);
      return next;
    });
  };
  const removeSideChatDraft = (draftId: string) => {
    setSideChatDrafts((current) => {
      const next = normalizeSideChatDrafts(current.filter((draft) => draft.id !== draftId));
      void document.saveSideChatDrafts(next);
      return next;
    });
  };
  const toggleRecentContextFavorite = (itemId: string) => {
    setRecentContextItems((current) => {
      const next = toggleRecentContextItemFavorite(current, itemId);
      void document.saveRecentContextItems(next);
      return next;
    });
  };
  const toggleWorkspaceFavorite = (path: string, label: string) => {
    setRecentContextItems((current) => {
      const next = toggleRecentContextPathFavorite(current, {
        kind: "workspace",
        label,
        path
      });
      void document.saveRecentContextItems(next);
      return next;
    });
  };
  const updateEvidenceExportPreferences = (patch: Partial<EvidenceExportPreferences>) => {
    setEvidenceExportPreferences((current) => {
      const next = normalizeEvidenceExportPreferences({
        ...current,
        ...patch
      });
      void document.saveEvidenceExportPreferences(next);
      return next;
    });
  };
  const {
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
  } = useWorkbenchActions({
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
  });
  const commandPaletteActions = useMemo<readonly CommandPaletteAction[]>(
    () => [
      {
        id: "start-session",
        label: i18n.t("workbench.commandPalette.newSession"),
        detail: formatRunnerModeLabel(i18n, runnerMode),
        disabled: runnerBusy,
        run: startNewSession
      },
      {
        id: "choose-workspace",
        label: i18n.t("workbench.commandPalette.chooseWorkspace"),
        detail: workspacePath,
        run: chooseWorkspace
      },
      {
        id: "attach-workspace-context",
        label: i18n.t("workbench.commandPalette.attachWorkspaceContext"),
        detail: activeSession?.workspacePath ?? workspacePath,
        disabled: !activeSession,
        run: () => {
          void attachWorkspaceContext();
          openInspectorTab("files");
        }
      },
      {
        id: "attach-file-context",
        label: i18n.t("workbench.commandPalette.attachFileContext"),
        detail: activeSession?.workspacePath ?? workspacePath,
        disabled: !activeSession,
        run: () => {
          void attachFileContext();
          openInspectorTab("files");
        }
      },
      {
        id: "show-review",
        label: i18n.t("workbench.commandPalette.showReview"),
        detail: i18n.t("workbench.workspacePanel.review"),
        run: () => openInspectorTab("review")
      },
      {
        id: "show-terminal",
        label: i18n.t("workbench.commandPalette.showTerminal"),
        detail: i18n.t("workbench.workspacePanel.terminal"),
        run: () => openInspectorTab("terminal")
      },
      {
        id: "show-browser",
        label: i18n.t("workbench.commandPalette.showBrowser"),
        detail: i18n.t("workbench.workspacePanel.browser"),
        run: () => openInspectorTab("browser")
      },
      {
        id: "show-files",
        label: i18n.t("workbench.commandPalette.showFiles"),
        detail: i18n.t("workbench.workspacePanel.files"),
        run: () => openInspectorTab("files")
      },
      {
        id: "show-side-chat",
        label: i18n.t("workbench.commandPalette.showSideChat"),
        detail: i18n.t("workbench.workspacePanel.chat"),
        run: () => openInspectorTab("chat")
      },
      {
        id: "show-settings",
        label: i18n.t("workbench.commandPalette.showSettings"),
        detail: i18n.t("workbench.workspacePanel.settings"),
        run: openSettings
      },
      {
        id: "toggle-left",
        label: i18n.t("workbench.commandPalette.toggleLeft"),
        run: () => setLeftPanelOpen((open) => !open)
      },
      {
        id: "toggle-right",
        label: i18n.t("workbench.commandPalette.toggleRight"),
        run: () => setRightPanelOpen((open) => !open)
      }
    ],
    [
      activeSession,
      attachFileContext,
      attachWorkspaceContext,
      chooseWorkspace,
      i18n,
      runnerBusy,
      runnerMode,
      startSelectedRunner,
      workspacePath
    ]
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandPaletteOpen(true);
      }
    };

    globalThis.document.addEventListener("keydown", onKeyDown);
    return () => globalThis.document.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (!activeSession) {
      setMaterializedInspectorData(undefined);
      return;
    }

    let cancelled = false;
    const sessionId = activeSession.id;

    void (async () => {
      const [
        contextAttachments,
        toolCalls,
        commandOutputs,
        diffSummaries,
        usageMetadata,
        runAttempts
      ] = await Promise.all([
        document.materializedEventStore.listContextAttachments(sessionId),
        document.materializedEventStore.listToolCalls(sessionId),
        document.materializedEventStore.listCommandOutputs(sessionId),
        document.materializedEventStore.listDiffSummaries(sessionId),
        document.materializedEventStore.listUsageMetadata(sessionId),
        document.materializedEventStore.listRunAttempts(sessionId)
      ]);

      if (cancelled) {
        return;
      }

      setMaterializedInspectorData(
        createMaterializedInspectorSessionReadModel(
          {
            sessionId,
            contextAttachments,
            toolCalls,
            commandOutputs,
            diffSummaries,
            usageMetadata,
            runAttempts
          },
          activeSession
        )
      );
    })();

    return () => {
      cancelled = true;
    };
  }, [activeSession?.id, document, inspectorEvidenceSignature]);

  // Load native sessions when workspace or refresh key changes
  useEffect(() => {
    const targetWorkspace = workspacePath === "__all__" ? document.activeWorkspace.path : workspacePath;

    void (async () => {
      try {
        const [claudeSessions, codexSessions] = await Promise.all([
          listNativeSessions(targetWorkspace, "claude"),
          listNativeSessions(targetWorkspace, "codex")
        ]);
        setNativeClaudeSessions(claudeSessions);
        setNativeCodexSessions(codexSessions);
      } catch (error) {
        console.error("Failed to load native sessions:", error);
        setNativeClaudeSessions([]);
        setNativeCodexSessions([]);
      }
    })();
  }, [document.activeWorkspace.path, workspacePath, nativeSessionsRefreshKey]);

  // Real-time native sessions refresh via Tauri event
  useEffect(() => {
    const isTauri = Boolean((globalThis as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__);
    if (!isTauri) {
      return;
    }

    const unlisten = listen("geond-agent://native-sessions-changed", () => {
      setNativeSessionsRefreshKey((key) => key + 1);
    });

    return () => {
      unlisten.then((fn) => fn()).catch(console.error);
    };
  }, []);

  // Refresh native sessions on window focus as fallback
  useEffect(() => {
    const isTauri = Boolean((globalThis as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__);
    if (!isTauri) {
      return;
    }

    const handleFocus = () => {
      setNativeSessionsRefreshKey((key) => key + 1);
    };

    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, []);

  function openInspectorTab(tab: string) {
    if (tab === "settings") {
      openSettings();
      return;
    }
    updateLayoutPreference({
      inspectorTab: tab,
      rightPanelOpen: true
    });
  }

  function openSettings() {
    setSettingsPanelOpen(true);
  }

  function closeSettings() {
    setSettingsPanelOpen(false);
  }

  function setInspectorTab(tab: string) {
    updateLayoutPreference({ inspectorTab: tab });
  }

  function setLeftPanelOpen(value: boolean | ((open: boolean) => boolean)) {
    updateLayoutPreference((previous) => ({
      leftPanelOpen:
        typeof value === "function" ? value(previous.leftPanelOpen) : value
    }));
  }

  function setRightPanelOpen(value: boolean | ((open: boolean) => boolean)) {
    updateLayoutPreference((previous) => ({
      rightPanelOpen:
        typeof value === "function" ? value(previous.rightPanelOpen) : value
    }));
  }

  function updateLayoutPreference(
    patch:
      | Partial<DesktopWorkbenchLayoutPreference>
      | ((
          previous: DesktopWorkbenchLayoutPreference
        ) => Partial<DesktopWorkbenchLayoutPreference>)
  ) {
    setLayoutPreference((previous) => {
      const next = {
        ...previous,
        ...(typeof patch === "function" ? patch(previous) : patch)
      };
      void document.saveLayoutPreference(next);
      return next;
    });
  }

  return (
    <main className="workbench-shell">
      <div className="workbench-frame">
        <AppBar
          activeSession={activeSession}
          i18n={i18n}
          leftPanelOpen={leftPanelOpen}
          rightPanelOpen={rightPanelOpen}
          runnerBusy={runnerBusy}
          runnerMode={runnerMode}
          sessionDefaults={sessionDefaults}
          sessionCount={projection.sessions.length}
          setCommandPaletteOpen={setCommandPaletteOpen}
          setInspectorTab={setInspectorTab}
          setLeftPanelOpen={setLeftPanelOpen}
          setRightPanelOpen={setRightPanelOpen}
        />

        <section
          className="workbench-grid"
          data-left-open={leftPanelOpen}
          data-right-open={rightPanelOpen}
        >
          {leftPanelOpen ? (
            <SessionRailPane
              activeSessionId={activeSession?.id}
              activeSessionTitle={activeSession?.title}
              archivedSessions={archivedSessions}
              chooseWorkspace={chooseWorkspace}
              i18n={i18n}
              onDeleteSession={deleteSession}
              onArchiveSession={archiveSession}
              onOpenSettings={openSettings}
              onRestoreSession={unarchiveSession}
              onSelectNativeSession={selectNativeSession}
              onStartNewChat={createNewChat}
              projection={projection}
              selectSession={selectSession}
              sessionQuery={sessionQuery}
              setSessionQuery={setSessionQuery}
              setWorkspacePath={selectWorkspacePath}
              toggleWorkspaceFavorite={toggleWorkspaceFavorite}
              workspaceSessionGroups={workspaceSessionGroups}
            />
          ) : null}

          <TimelinePane
            activeIsNative={activeIsNative}
            activeRunMode={activeRunMode}
            activeSession={activeSession}
            activeSessionPinned={activeSessionPinned}
            attachFileContext={attachFileContext}
            attachWorkspaceContext={attachWorkspaceContext}
            canResumeActiveSession={canResumeActiveSession}
            cancelActiveRun={cancelActiveRun}
            composerPrompt={composerPrompt}
            deleteActiveSession={deleteActiveSession}
            i18n={i18n}
            onResumeActiveNativeSession={resumeActiveNativeSession}
            pendingApprovals={pendingApprovals}
            resumeActiveSession={resumeActiveSession}
            retryActiveSession={retryActiveSession}
            runnerBusy={runnerBusy}
            runnerMode={runnerMode}
            runnerStatus={runnerStatus}
            sessionDefaults={sessionDefaults}
            setComposerPrompt={setComposerPrompt}
            setInspectorTab={openInspectorTab}
            startNewSession={startNewSession}
            startSelectedRunner={startSelectedRunner}
            togglePinnedSession={togglePinnedSession}
            openSettings={openSettings}
          />

          {rightPanelOpen ? (
            <WorkbenchErrorBoundary
              detail={i18n.t("workbench.panelError.detail")}
              resetKey={`${activeSession?.id ?? "no-session"}:${inspectorTab}`}
              resetLabel={i18n.t("workbench.panelError.closePanel")}
              title={i18n.t("workbench.panelError.title")}
              onReset={() => setRightPanelOpen(false)}
            >
              <InspectorPane
                activeExternalSession={activeExternalSession}
                activeRunMode={activeRunMode}
                activeSession={activeSession}
                attachRecentContext={attachRecentContext}
                attachFileContext={attachFileContext}
                attachWorkspaceContext={attachWorkspaceContext}
                agentLanguageOptions={agentLanguageOptions}
                backendOptions={backendOptions}
                bridgeCommand={document.bridgeCommand}
                claudeCliProbe={document.claudeCliProbe}
                canFollowUpApprovals={canFollowUpApprovals}
                composerEnterBehaviorOptions={composerEnterBehaviorOptions}
                drafts={visibleSideChatDrafts}
                enqueueSideChatDraft={enqueueSideChatDraft}
                evidenceExportPreferences={evidenceExportPreferences}
                followUpPolicyOptions={followUpPolicyOptions}
                ignoredRecordCount={ignoredRecordCount}
                i18n={i18n}
                inspectorTab={inspectorTab}
                inspectorData={inspectorData}
                projectedSessions={projection.sessions}
                modelAliasOptions={modelAliasOptions}
                permissionModeOptions={permissionModeOptions}
                persistenceNotes={document.persistence.notes}
                providerRouteOptions={providerRouteOptions}
                providerSummary={document.providerSummary}
                recentContextItems={recentContextItems}
                removeSideChatDraft={removeSideChatDraft}
                reviewDeliveryOptions={reviewDeliveryOptions}
                resolveApproval={resolveApproval}
                routingModeOptions={routingModeOptions}
                runtimeSnapshot={runtimeSnapshot}
                runnerBusy={runnerBusy}
                runnerMode={runnerMode}
                runnerStatus={runnerStatus}
                sessionDefaults={sessionDefaults}
                settingsLabels={settingsLabels}
                setComposerPrompt={setComposerPrompt}
                setInspectorTab={setInspectorTab}
                setRunnerStatus={setRunnerStatus}
                toggleRecentContextFavorite={toggleRecentContextFavorite}
                updateEvidenceExportPreferences={updateEvidenceExportPreferences}
                updateAgentResponseLanguage={updateAgentResponseLanguage}
                updateRunnerMode={updateRunnerMode}
                updateSessionDefaults={updateSessionDefaults}
                updateUiLanguage={updateUiLanguage}
                openSettings={openSettings}
              />
            </WorkbenchErrorBoundary>
          ) : null}
        </section>
      </div>
      <CommandPalette
        actions={commandPaletteActions}
        i18n={i18n}
        onClose={() => setCommandPaletteOpen(false)}
        open={commandPaletteOpen}
      />
      {settingsPanelOpen ? (
        <SettingsPanel
          agentLanguageOptions={agentLanguageOptions}
          backendOptions={backendOptions}
          bridgeCommand={document.bridgeCommand}
          claudeCliProbe={document.claudeCliProbe}
          composerEnterBehaviorOptions={composerEnterBehaviorOptions}
          followUpPolicyOptions={followUpPolicyOptions}
          i18n={i18n}
          modelAliasOptions={modelAliasOptions}
          permissionModeOptions={permissionModeOptions}
          persistenceNotes={document.persistence.notes}
          providerRouteOptions={providerRouteOptions}
          reviewDeliveryOptions={reviewDeliveryOptions}
          routingModeOptions={routingModeOptions}
          runtimeSnapshot={runtimeSnapshot}
          runnerMode={runnerMode}
          selectionReadiness={activeSession?.selection?.readiness}
          sessionDefaults={sessionDefaults}
          settingsLabels={settingsLabels}
          updateAgentResponseLanguage={updateAgentResponseLanguage}
          updateRunnerMode={updateRunnerMode}
          updateSessionDefaults={updateSessionDefaults}
          updateUiLanguage={updateUiLanguage}
          onClose={closeSettings}
        />
      ) : null}
    </main>
  );
}
