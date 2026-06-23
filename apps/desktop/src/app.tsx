import { useEffect, useMemo, useState } from "react";

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
import { AppBar } from "./panes/app-bar.js";
import { InspectorPane } from "./panes/inspector.js";
import { SessionRailPane } from "./panes/session-rail.js";
import { TimelinePane } from "./panes/timeline.js";
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
import {
  toggleRecentContextItemFavorite,
  type RecentContextItem
} from "./lib/recent-context.js";

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
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
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
    pendingApprovals,
    workspaceSessionGroups,
    workspaceOptions
  } = useWorkbenchDerivedState({
    i18n,
    pinnedSessionIds,
    projection,
    selectedWorkspaces,
    sessionDefaults,
    sessionQuery,
    workspacePath
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
  const {
    attachFileContext,
    attachRecentContext,
    attachWorkspaceContext,
    chooseWorkspace,
    deleteActiveSession,
    resolveApproval,
    resumeActiveSession,
    retryActiveSession,
    selectSession,
    startSelectedRunner,
    togglePinnedSession,
    updateAgentResponseLanguage,
    updateSessionDefaults,
    updateUiLanguage
  } = useWorkbenchActions({
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
        detail:
          runnerMode === "claude-live"
            ? i18n.t("workbench.runner.claudeLive")
            : i18n.t("workbench.runner.fixture"),
        disabled: runnerBusy,
        run: startSelectedRunner
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
        run: () => openInspectorTab("settings")
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

  function openInspectorTab(tab: string) {
    updateLayoutPreference({
      inspectorTab: tab,
      rightPanelOpen: true
    });
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
              chooseWorkspace={chooseWorkspace}
              i18n={i18n}
              projection={projection}
              selectSession={selectSession}
              sessionQuery={sessionQuery}
              setSessionQuery={setSessionQuery}
              setWorkspacePath={selectWorkspacePath}
              workspaceSessionGroups={workspaceSessionGroups}
            />
          ) : null}

          <TimelinePane
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
            pendingApprovals={pendingApprovals}
            resumeActiveSession={resumeActiveSession}
            retryActiveSession={retryActiveSession}
            runnerBusy={runnerBusy}
            runnerMode={runnerMode}
            runnerStatus={runnerStatus}
            sessionDefaults={sessionDefaults}
            setComposerPrompt={setComposerPrompt}
            setInspectorTab={openInspectorTab}
            startSelectedRunner={startSelectedRunner}
            togglePinnedSession={togglePinnedSession}
          />

          {rightPanelOpen ? (
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
              updateAgentResponseLanguage={updateAgentResponseLanguage}
              updateRunnerMode={updateRunnerMode}
              updateSessionDefaults={updateSessionDefaults}
              updateUiLanguage={updateUiLanguage}
            />
          ) : null}
        </section>
      </div>
      <CommandPalette
        actions={commandPaletteActions}
        i18n={i18n}
        onClose={() => setCommandPaletteOpen(false)}
        open={commandPaletteOpen}
      />
    </main>
  );
}
