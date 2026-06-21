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
  type WorkbenchEvent,
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
  readonly chooseWorkspace: (
    defaultPath?: string
  ) => Promise<DesktopWorkspaceDescriptor | undefined>;
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
  const workspaceResolver = createDesktopWorkspaceResolver();
  const workspaces = await workspaceResolver.listWorkspaces();
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
  const persistedEvents = await eventStore.list();
  const initialDocument =
    persistedEvents.length > 0
      ? {
          events: persistedEvents,
          ignoredRecordCount: 0,
          activeSessionId: lastSessionId(persistedEvents) ?? initialSessionId
        }
      : await createInitialFixtureDocument({
          activeWorkspace,
          eventStore,
          initialSessionId,
          languageSettings: runtimeSnapshot.languageSettings,
          runner,
          sessionDefaults: workbench.sessionDefaults
        });
  const controller = createWorkbenchSessionController({
    initialEvents: initialDocument.events,
    pinnedSessionIds: initialDocument.activeSessionId === initialSessionId ? [initialSessionId] : [],
    activeSessionId: initialDocument.activeSessionId
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
    ignoredRecordCount: initialDocument.ignoredRecordCount,
    initialControllerSnapshot: controller.getSnapshot(),
    createRunnerRequest,
    runSession: (mode, request) =>
      mode === "claude-live" ? liveRunner.run(request) : runner.run(request),
    chooseWorkspace: (defaultPath) => workspaceResolver.chooseWorkspace({ defaultPath }),
    saveSessionDefaults: async (settings) => {
      await saveWorkbenchSessionDefaults(settingsStore, settings);
      return settings;
    }
  };
}

async function createInitialFixtureDocument(options: {
  readonly activeWorkspace: DesktopWorkspaceDescriptor;
  readonly eventStore: DesktopWorkbenchEventStore;
  readonly initialSessionId: string;
  readonly languageSettings: WorkbenchLanguageSettings;
  readonly runner: ClaudeCodeFixtureReplayRunner;
  readonly sessionDefaults: WorkbenchSessionDefaults;
}): Promise<{
  readonly events: readonly WorkbenchEvent[];
  readonly ignoredRecordCount: number;
  readonly activeSessionId: string;
}> {
  const initialRun = await options.runner.run(
    createRunnerRequest({
      sessionId: options.initialSessionId,
      title: "Local workbench session",
      prompt: "Start a local demo session without making paid provider calls.",
      languageSettings: options.languageSettings,
      sessionDefaults: options.sessionDefaults,
      workspacePath: options.activeWorkspace.path
    })
  );
  await options.eventStore.append(initialRun.events);

  return {
    events: initialRun.events,
    ignoredRecordCount: initialRun.ignoredRecords.length,
    activeSessionId: options.initialSessionId
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

function lastSessionId(events: readonly WorkbenchEvent[]): string | undefined {
  return events[events.length - 1]?.sessionId;
}
