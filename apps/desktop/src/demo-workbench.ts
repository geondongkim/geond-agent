import {
  createClaudeCodeFixtureReplayRunner,
  type ClaudeCodeFixtureReplayRunner,
  type ClaudeCodeRunnerRequest
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

import { createDesktopWorkbench } from "./index.js";

export interface DesktopDemoDocument {
  readonly runtime: WorkbenchRuntime;
  readonly controller: WorkbenchSessionController;
  readonly runner: ClaudeCodeFixtureReplayRunner;
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
}

const WORKSPACE_PATH = "/Users/geondongkim/geond-agent";

export async function createDesktopDemoDocument(
  settingsStore: LocalSettingsStore
): Promise<DesktopDemoDocument> {
  const workbench = await createDesktopWorkbench({
    settingsStore,
    systemLocales: navigator.languages,
    workspacePath: WORKSPACE_PATH
  });
  const runtimeSnapshot = workbench.ui.getSnapshot();
  const runner = createClaudeCodeFixtureReplayRunner();
  const initialSessionId = "local-session-1";
  const initialRun = await runner.run(
    createRunnerRequest({
      sessionId: initialSessionId,
      title: "Local workbench session",
      prompt: "Start a local demo session without making paid provider calls.",
      languageSettings: runtimeSnapshot.languageSettings,
      sessionDefaults: workbench.sessionDefaults
    })
  );
  const controller = createWorkbenchSessionController({
    initialEvents: initialRun.events,
    pinnedSessionIds: [initialSessionId],
    activeSessionId: initialSessionId
  });

  return {
    runtime: workbench.ui,
    controller,
    runner,
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
    workspacePath: WORKSPACE_PATH,
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
