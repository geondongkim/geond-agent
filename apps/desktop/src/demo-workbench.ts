import {
  createClaudeCodeFixtureReplayRunner,
  createClaudeCodeProcessRunner,
  type ClaudeCodeFixtureReplayRunner,
  type ClaudeCodeProcessRunner,
  type ClaudeCodeProcessRunnerResult,
  type ClaudeCodeRunnerRequest,
  type ClaudeCodeRunnerResult
} from "@geond-agent/claude-code-bridge";
import {
  createWorkbenchSettingsLabels,
  createWorkbenchSessionController,
  saveWorkbenchSessionDefaults,
  type AgentResponseLanguage,
  type LocalSettingsStore,
  type UiI18n,
  type WorkbenchLanguageSettings,
  type WorkbenchPersistenceBoundary,
  type WorkbenchRuntime,
  type WorkbenchSessionController,
  type WorkbenchSessionControllerSnapshot,
  type WorkbenchSessionDefaults,
  type WorkbenchSettingsLabels
} from "@geond-agent/ui-workbench";

import { createTauriClaudeCodeExecutor } from "./claude-runner.js";
import { createDesktopWorkbench } from "./index.js";
import type { DesktopWorkbenchEventStore } from "./persistence/event-store.js";
import { createDesktopWorkbenchEventStore } from "./persistence/event-store.js";
import type { DesktopWorkspaceDescriptor } from "./workspace.js";
import { createDesktopWorkspaceResolver } from "./workspace.js";

export type DesktopRunnerMode = "fixture" | "claude-live";

export interface DesktopDemoDocument {
  readonly runtime: WorkbenchRuntime;
  readonly controller: WorkbenchSessionController;
  readonly runner: ClaudeCodeFixtureReplayRunner;
  readonly liveRunner: ClaudeCodeProcessRunner;
  readonly eventStore: DesktopWorkbenchEventStore;
  readonly workspaces: readonly DesktopWorkspaceDescriptor[];
  readonly activeWorkspace: DesktopWorkspaceDescriptor;
  readonly i18n: UiI18n;
  readonly settingsLabels: WorkbenchSettingsLabels;
  readonly languageSettings: WorkbenchLanguageSettings;
  readonly sessionDefaults: WorkbenchSessionDefaults;
  readonly persistence: WorkbenchPersistenceBoundary;
  readonly providerSummary: string;
  readonly bridgeCommand: string;
  readonly ignoredRecordCount: number;
  readonly initialControllerSnapshot: WorkbenchSessionControllerSnapshot;
  readonly createRunnerRequest: (options: CreateRunnerRequestOptions) => ClaudeCodeRunnerRequest;
  readonly runSession: (
    mode: DesktopRunnerMode,
    request: ClaudeCodeRunnerRequest
  ) => Promise<ClaudeCodeRunnerResult | ClaudeCodeProcessRunnerResult>;
  readonly saveSessionDefaults: (
    settings: WorkbenchSessionDefaults
  ) => Promise<WorkbenchSessionDefaults>;
}

export interface CreateRunnerRequestOptions {
  readonly sessionId: string;
  readonly title: string;
  readonly prompt: string;
  readonly languageSettings: WorkbenchLanguageSettings;
  readonly sessionDefaults: WorkbenchSessionDefaults;
  readonly workspacePath: string;
}

export async function createDesktopDemoDocument(
  settingsStore: LocalSettingsStore
): Promise<DesktopDemoDocument> {
  const workspaces = await createDesktopWorkspaceResolver().listWorkspaces();
  const activeWorkspace = workspaces[0] ?? {
    id: "geond-agent",
    label: "geond-agent",
    path: "geond-agent"
  };
  const workbench = await createDesktopWorkbench({
    settingsStore,
    systemLocales: navigator.languages,
    workspacePath: activeWorkspace.path
  });
  const runtimeSnapshot = workbench.ui.getSnapshot();
  const runner = createClaudeCodeFixtureReplayRunner();
  const liveRunner = createClaudeCodeProcessRunner(createTauriClaudeCodeExecutor());
  const eventStore = createDesktopWorkbenchEventStore();
  const initialSessionId = "local-session-1";
  const initialRun = await runner.run(
    createRunnerRequest({
      sessionId: initialSessionId,
      title: "Local workbench session",
      prompt: "Start a local demo session without making paid provider calls.",
      languageSettings: runtimeSnapshot.languageSettings,
      sessionDefaults: workbench.sessionDefaults,
      workspacePath: activeWorkspace.path
    })
  );
  await eventStore.append(initialRun.events);
  const controller = createWorkbenchSessionController({
    initialEvents: initialRun.events,
    pinnedSessionIds: [initialSessionId],
    activeSessionId: initialSessionId
  });

  return {
    runtime: workbench.ui,
    controller,
    runner,
    liveRunner,
    eventStore,
    workspaces,
    activeWorkspace,
    i18n: runtimeSnapshot.i18n,
    settingsLabels: createWorkbenchSettingsLabels(runtimeSnapshot.i18n),
    languageSettings: runtimeSnapshot.languageSettings,
    sessionDefaults: workbench.sessionDefaults,
    persistence: workbench.persistence,
    providerSummary: workbench.providerSummary,
    bridgeCommand: [workbench.bridge.process.executable, ...workbench.bridge.process.args]
      .filter((value) => value.length > 0)
      .join(" "),
    ignoredRecordCount: initialRun.ignoredRecords.length,
    initialControllerSnapshot: controller.getSnapshot(),
    createRunnerRequest,
    runSession: (mode, request) =>
      mode === "claude-live" ? liveRunner.run(request) : runner.run(request),
    saveSessionDefaults: async (settings) => {
      await saveWorkbenchSessionDefaults(settingsStore, settings);
      return settings;
    }
  };
}

function createRunnerRequest(options: CreateRunnerRequestOptions): ClaudeCodeRunnerRequest {
  return {
    sessionId: options.sessionId,
    title: options.title,
    workspacePath: options.workspacePath,
    prompt: options.prompt,
    modelAlias: options.sessionDefaults.defaultModelAlias,
    providerRouteId: options.sessionDefaults.defaultProviderRouteId,
    modelProfileId: options.sessionDefaults.defaultModelAlias,
    backendAdapterId: options.sessionDefaults.defaultBackendAdapterId,
    routingMode: options.sessionDefaults.routingMode,
    uiLanguage: options.languageSettings.uiLanguage,
    agentResponseLanguage: normalizeAgentLanguageForRunner(
      options.languageSettings.agentResponseLanguage
    )
  };
}

function normalizeAgentLanguageForRunner(
  language: AgentResponseLanguage
): AgentResponseLanguage {
  return language;
}
