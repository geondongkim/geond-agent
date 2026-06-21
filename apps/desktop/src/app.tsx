import { useState } from "react";

import {
  type WorkbenchRuntimeSnapshot,
  type WorkbenchSessionDefaults
} from "@geond-agent/ui-workbench";

import type { DesktopDemoDocument, DesktopRunnerMode } from "./demo-workbench.js";
import { CommandStrip } from "./panes/command-strip.js";
import { InspectorPane } from "./panes/inspector.js";
import { SessionRailPane } from "./panes/session-rail.js";
import { TimelinePane } from "./panes/timeline.js";
import { useWorkbenchActions } from "./lib/use-workbench-actions.js";
import { useWorkbenchDerivedState } from "./lib/use-workbench-derived-state.js";
import { useWorkbenchOptions } from "./lib/use-workbench-options.js";
import { useWorkbenchRunner } from "./runs/use-workbench-runner.js";

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
  const [inspectorTab, setInspectorTab] = useState("diff");
  const [runnerMode, setRunnerMode] = useState<DesktopRunnerMode>("fixture");
  const [ignoredRecordCount, setIgnoredRecordCount] = useState(document.ignoredRecordCount);
  const [composerPrompt, setComposerPrompt] = useState("");

  const i18n = runtimeSnapshot.i18n;
  const { agentLanguageOptions, routingModeOptions, settingsLabels } = useWorkbenchOptions(i18n);
  const projection = controllerSnapshot.projection;
  const {
    activeExternalSession,
    activeSession,
    activeSessionListItem,
    activeSessionPinned,
    pendingApprovals,
    visiblePinnedSessions,
    visibleRecentSessions,
    workspaceOptions
  } = useWorkbenchDerivedState({
    pinnedSessionIds,
    projection,
    selectedWorkspaces,
    sessionDefaults,
    sessionQuery,
    workspacePath
  });
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
    setControllerSnapshot,
    setIgnoredRecordCount,
    workspacePath
  });
  const canResumeActiveSession = Boolean(activeSessionListItem?.resumable && activeExternalSession && !runnerBusy);
  const {
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
    setRunnerStatus,
    setRuntimeSnapshot,
    setSelectedWorkspaces,
    setSessionDefaults,
    setWorkspacePath,
    startSession,
    workspacePath
  });

  return (
    <main className="workbench-shell">
      <div className="workbench-frame">
        <CommandStrip
          activeRunMode={activeRunMode}
          activeSession={activeSession}
          activeSessionApprovalCount={activeSession?.approvals.length ?? 0}
          activeSessionPinned={activeSessionPinned}
          canResumeActiveSession={canResumeActiveSession}
          cancelActiveRun={cancelActiveRun}
          deleteActiveSession={deleteActiveSession}
          i18n={i18n}
          resumeActiveSession={resumeActiveSession}
          runnerBusy={runnerBusy}
          runnerMode={runnerMode}
          sessionCount={projection.sessions.length}
          setInspectorTab={setInspectorTab}
          setRunnerMode={setRunnerMode}
          startSelectedRunner={startSelectedRunner}
          togglePinnedSession={togglePinnedSession}
        />

        <section className="workbench-grid">
          <SessionRailPane
            activeSessionId={activeSession?.id}
            activeSessionTitle={activeSession?.title}
            chooseWorkspace={chooseWorkspace}
            i18n={i18n}
            projection={projection}
            selectSession={selectSession}
            sessionQuery={sessionQuery}
            setSessionQuery={setSessionQuery}
            setWorkspacePath={setWorkspacePath}
            visiblePinnedSessions={visiblePinnedSessions}
            visibleRecentSessions={visibleRecentSessions}
            workspaceOptions={workspaceOptions}
            workspacePath={workspacePath}
          />

          <TimelinePane
            activeSession={activeSession}
            canResumeActiveSession={canResumeActiveSession}
            composerPrompt={composerPrompt}
            i18n={i18n}
            pendingApprovals={pendingApprovals}
            resumeActiveSession={resumeActiveSession}
            runnerBusy={runnerBusy}
            runnerMode={runnerMode}
            runnerStatus={runnerStatus}
            sessionDefaults={sessionDefaults}
            setComposerPrompt={setComposerPrompt}
            setInspectorTab={setInspectorTab}
            startSelectedRunner={startSelectedRunner}
          />

          <InspectorPane
            activeExternalSession={activeExternalSession}
            activeSession={activeSession}
            agentLanguageOptions={agentLanguageOptions}
            bridgeCommand={document.bridgeCommand}
            ignoredRecordCount={ignoredRecordCount}
            i18n={i18n}
            inspectorTab={inspectorTab}
            persistenceNotes={document.persistence.notes}
            providerSummary={document.providerSummary}
            resolveApproval={resolveApproval}
            routingModeOptions={routingModeOptions}
            runtimeSnapshot={runtimeSnapshot}
            sessionDefaults={sessionDefaults}
            settingsLabels={settingsLabels}
            setInspectorTab={setInspectorTab}
            updateAgentResponseLanguage={updateAgentResponseLanguage}
            updateSessionDefaults={updateSessionDefaults}
            updateUiLanguage={updateUiLanguage}
          />
        </section>
      </div>
    </main>
  );
}
