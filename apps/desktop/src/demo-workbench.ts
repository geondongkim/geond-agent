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
  buildWorkbenchSessionIndex,
  loadWorkbenchPinnedSessionIds,
  saveWorkbenchSessionDefaults,
  saveWorkbenchPinnedSessionIds,
  validateWorkbenchSessionDefaults,
  createWorkbenchSessionIndexFromEntries,
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
  type WorkbenchSessionIndexEntry,
  type WorkbenchSessionIndexSnapshot,
  type WorkbenchSettingsLabels,
  type WorkbenchSelectionCatalog
} from "@geond-agent/ui-workbench";

import { createTauriClaudeCodeExecutor } from "./claude-runner.js";
import { createDesktopWorkbench } from "./index.js";
import type { DesktopWorkbenchEventStore } from "./persistence/event-store.js";
import { createDesktopWorkbenchEventStore } from "./persistence/event-store.js";
import type { DesktopMaterializedEventStore } from "./persistence/materialized-event-store.js";
import { createDesktopMaterializedEventStore } from "./persistence/materialized-event-store.js";
import type { DesktopWorkbenchSessionIndexStore } from "./persistence/session-index.js";
import { createDesktopWorkbenchSessionIndexStore } from "./persistence/session-index.js";
import {
  LAYOUT_SETTINGS_KEY,
  RUNNER_MODE_SETTINGS_KEY,
  WORKSPACE_SETTINGS_KEY
} from "./persistence/tauri-settings.js";
import {
  loadSideChatDrafts,
  saveSideChatDrafts,
  type SideChatDraft
} from "./lib/side-chat-drafts.js";
import type { DesktopWorkspaceDescriptor } from "./workspace.js";
import {
  FALLBACK_WORKSPACE,
  createDesktopWorkspaceDescriptor,
  createDesktopWorkspaceResolver
} from "./workspace.js";

export type DesktopRunnerMode = "fixture" | "claude-live";

export interface DesktopWorkbenchLayoutPreference {
  readonly leftPanelOpen: boolean;
  readonly rightPanelOpen: boolean;
  readonly inspectorTab: string;
}

export interface DesktopDemoDocument {
  readonly runtime: WorkbenchRuntime;
  readonly controller: WorkbenchSessionController;
  readonly runner: ClaudeCodeFixtureReplayRunner;
  readonly liveRunner: ClaudeCodeProcessRunner;
  readonly eventStore: DesktopWorkbenchEventStore;
  readonly materializedEventStore: DesktopMaterializedEventStore;
  readonly sessionIndexStore: DesktopWorkbenchSessionIndexStore;
  readonly workspaces: readonly DesktopWorkspaceDescriptor[];
  readonly activeWorkspace: DesktopWorkspaceDescriptor;
  readonly i18n: UiI18n;
  readonly settingsLabels: WorkbenchSettingsLabels;
  readonly languageSettings: WorkbenchLanguageSettings;
  readonly sessionDefaults: WorkbenchSessionDefaults;
  readonly runnerMode: DesktopRunnerMode;
  readonly layoutPreference: DesktopWorkbenchLayoutPreference;
  readonly sideChatDrafts: readonly SideChatDraft[];
  readonly sessionDefaultWarnings: readonly string[];
  readonly selectionCatalog: WorkbenchSelectionCatalog;
  readonly persistence: WorkbenchPersistenceBoundary;
  readonly providerSummary: string;
  readonly bridgeCommand: string;
  readonly ignoredRecordCount: number;
  readonly pinnedSessionIds: readonly string[];
  readonly initialControllerSnapshot: WorkbenchSessionControllerSnapshot;
  readonly createRunnerRequest: (options: CreateRunnerRequestOptions) => ClaudeCodeRunnerRequest;
  readonly runSession: (
    mode: DesktopRunnerMode,
    request: ClaudeCodeRunnerRequest
  ) => Promise<ClaudeCodeRunnerResult | ClaudeCodeProcessRunnerResult>;
  readonly chooseWorkspace: (
    defaultPath?: string
  ) => Promise<DesktopWorkspaceDescriptor | undefined>;
  readonly chooseFile: (
    defaultPath?: string
  ) => Promise<DesktopWorkspaceDescriptor | undefined>;
  readonly saveWorkspace: (
    workspace: DesktopWorkspaceDescriptor
  ) => Promise<DesktopWorkspaceDescriptor>;
  readonly saveRunnerMode: (mode: DesktopRunnerMode) => Promise<DesktopRunnerMode>;
  readonly saveLayoutPreference: (
    preference: DesktopWorkbenchLayoutPreference
  ) => Promise<DesktopWorkbenchLayoutPreference>;
  readonly saveSideChatDrafts: (
    drafts: readonly SideChatDraft[]
  ) => Promise<readonly SideChatDraft[]>;
  readonly saveSessionDefaults: (
    settings: WorkbenchSessionDefaults
  ) => Promise<WorkbenchSessionDefaults>;
  readonly savePinnedSessionIds: (
    sessionIds: readonly string[]
  ) => Promise<readonly string[]>;
}

export interface CreateRunnerRequestOptions {
  readonly sessionId: string;
  readonly title: string;
  readonly prompt: string;
  readonly externalSessionId?: string;
  readonly languageSettings: WorkbenchLanguageSettings;
  readonly permissionModeOverride?: WorkbenchSessionDefaults["defaultPermissionMode"];
  readonly sessionDefaults: WorkbenchSessionDefaults;
  readonly workspacePath: string;
}

export async function createDesktopDemoDocument(
  settingsStore: LocalSettingsStore
): Promise<DesktopDemoDocument> {
  const workspaceResolver = createDesktopWorkspaceResolver();
  const listedWorkspaces = await workspaceResolver.listWorkspaces();
  const savedWorkspace = await loadSavedWorkspace(settingsStore);
  const workspaces = mergeWorkspaces([
    ...(savedWorkspace ? [savedWorkspace] : []),
    ...listedWorkspaces
  ]);
  const activeWorkspace = savedWorkspace ?? workspaces[0] ?? FALLBACK_WORKSPACE;
  const workbench = await createDesktopWorkbench({
    settingsStore,
    systemLocales: navigator.languages,
    workspacePath: activeWorkspace.path
  });
  const runtimeSnapshot = workbench.ui.getSnapshot();
  const savedRunnerMode = await loadSavedRunnerMode(settingsStore);
  const savedLayoutPreference = await loadSavedLayoutPreference(settingsStore);
  const savedSideChatDrafts = await loadSideChatDrafts(settingsStore);
  const runner = createClaudeCodeFixtureReplayRunner();
  const liveRunner = createClaudeCodeProcessRunner(createTauriClaudeCodeExecutor());
  const eventStore = createDesktopWorkbenchEventStore();
  const materializedEventStore = createDesktopMaterializedEventStore();
  const sessionIndexStore = createDesktopWorkbenchSessionIndexStore();
  const initialSessionId = "local-session-1";
  const persistedSessions = await sessionIndexStore.list();
  const initialDocument =
    persistedSessions.length > 0
      ? await createPersistedSessionDocument({
          eventStore,
          persistedSessions
        })
      : await createInitialFixtureDocument({
          activeWorkspace,
          eventStore,
          initialSessionId,
          i18n: runtimeSnapshot.i18n,
          languageSettings: runtimeSnapshot.languageSettings,
          runner,
          sessionDefaults: workbench.sessionDefaults
        });
  sessionIndexStore.replaceMemoryIndex(initialDocument.sessionIndex);
  const savedPinnedSessionIds = await loadWorkbenchPinnedSessionIds(settingsStore);
  const pinnedSessionIds =
    savedPinnedSessionIds.length > 0
      ? savedPinnedSessionIds
      : initialDocument.activeSessionId === initialSessionId
        ? [initialSessionId]
        : [];
  const controller = createWorkbenchSessionController({
    initialEvents: initialDocument.events,
    initialSessionIndex: initialDocument.sessionIndex,
    pinnedSessionIds,
    activeSessionId: initialDocument.activeSessionId
  });

  return {
    runtime: workbench.ui,
    controller,
    runner,
    liveRunner,
    eventStore,
    materializedEventStore,
    sessionIndexStore,
    workspaces,
    activeWorkspace,
    i18n: runtimeSnapshot.i18n,
    settingsLabels: createWorkbenchSettingsLabels(runtimeSnapshot.i18n),
    languageSettings: runtimeSnapshot.languageSettings,
    sessionDefaults: workbench.sessionDefaults,
    runnerMode: savedRunnerMode,
    layoutPreference: savedLayoutPreference,
    sideChatDrafts: savedSideChatDrafts,
    sessionDefaultWarnings: workbench.sessionDefaultWarnings,
    selectionCatalog: workbench.selectionCatalog,
    persistence: workbench.persistence,
    providerSummary: workbench.providerSummary,
    bridgeCommand: [workbench.bridge.process.executable, ...workbench.bridge.process.args]
      .filter((value) => value.length > 0)
      .join(" "),
    ignoredRecordCount: initialDocument.ignoredRecordCount,
    pinnedSessionIds,
    initialControllerSnapshot: controller.getSnapshot(),
    createRunnerRequest,
    runSession: (mode, request) =>
      mode === "claude-live" ? liveRunner.run(request) : runner.run(request),
    chooseWorkspace: (defaultPath) => workspaceResolver.chooseWorkspace({ defaultPath }),
    chooseFile: (defaultPath) => workspaceResolver.chooseFile({ defaultPath }),
    saveWorkspace: async (workspace) => {
      await settingsStore.setItem(WORKSPACE_SETTINGS_KEY, workspace.path);
      return workspace;
    },
    saveRunnerMode: async (mode) => {
      const validated = validateRunnerMode(mode);
      await settingsStore.setItem(RUNNER_MODE_SETTINGS_KEY, validated);
      return validated;
    },
    saveLayoutPreference: async (preference) => {
      const validated = validateLayoutPreference(preference);
      await settingsStore.setItem(LAYOUT_SETTINGS_KEY, JSON.stringify(validated));
      return validated;
    },
    saveSideChatDrafts: (drafts) => saveSideChatDrafts(settingsStore, drafts),
    saveSessionDefaults: async (settings) => {
      const validated = validateWorkbenchSessionDefaults(
        settings,
        workbench.selectionCatalog
      );
      await saveWorkbenchSessionDefaults(settingsStore, validated.defaults);
      return validated.defaults;
    },
    savePinnedSessionIds: (sessionIds) =>
      saveWorkbenchPinnedSessionIds(settingsStore, sessionIds)
  };
}

async function loadSavedLayoutPreference(
  settingsStore: LocalSettingsStore
): Promise<DesktopWorkbenchLayoutPreference> {
  const saved = await settingsStore.getItem(LAYOUT_SETTINGS_KEY);
  if (!saved) {
    return defaultLayoutPreference();
  }

  try {
    return validateLayoutPreference(JSON.parse(saved) as Partial<DesktopWorkbenchLayoutPreference>);
  } catch {
    return defaultLayoutPreference();
  }
}

async function loadSavedWorkspace(
  settingsStore: LocalSettingsStore
): Promise<DesktopWorkspaceDescriptor | undefined> {
  const path = await settingsStore.getItem(WORKSPACE_SETTINGS_KEY);
  return path && path.trim().length > 0
    ? createDesktopWorkspaceDescriptor(path)
    : undefined;
}

async function loadSavedRunnerMode(
  settingsStore: LocalSettingsStore
): Promise<DesktopRunnerMode> {
  const saved = await settingsStore.getItem(RUNNER_MODE_SETTINGS_KEY);
  return saved === "fixture" || saved === "claude-live"
    ? saved
    : defaultDesktopRunnerMode();
}

function defaultDesktopRunnerMode(): DesktopRunnerMode {
  return isTauriRuntime() ? "claude-live" : "fixture";
}

function isTauriRuntime(): boolean {
  return Boolean((globalThis as { readonly __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__);
}

function validateRunnerMode(mode: DesktopRunnerMode): DesktopRunnerMode {
  return mode === "claude-live" ? "claude-live" : "fixture";
}

function validateLayoutPreference(
  preference: Partial<DesktopWorkbenchLayoutPreference>
): DesktopWorkbenchLayoutPreference {
  const defaults = defaultLayoutPreference();
  const inspectorTab =
    typeof preference.inspectorTab === "string" &&
    ["review", "terminal", "browser", "files", "chat", "settings"].includes(
      preference.inspectorTab
    )
      ? preference.inspectorTab
      : defaults.inspectorTab;

  return {
    leftPanelOpen:
      typeof preference.leftPanelOpen === "boolean"
        ? preference.leftPanelOpen
        : defaults.leftPanelOpen,
    rightPanelOpen:
      typeof preference.rightPanelOpen === "boolean"
        ? preference.rightPanelOpen
        : defaults.rightPanelOpen,
    inspectorTab
  };
}

function defaultLayoutPreference(): DesktopWorkbenchLayoutPreference {
  return {
    leftPanelOpen: true,
    rightPanelOpen: false,
    inspectorTab: "review"
  };
}

function mergeWorkspaces(
  workspaces: readonly DesktopWorkspaceDescriptor[]
): readonly DesktopWorkspaceDescriptor[] {
  const merged = new Map<string, DesktopWorkspaceDescriptor>();
  workspaces.forEach((workspace) => merged.set(workspace.path, workspace));
  return [...merged.values()];
}

async function createPersistedSessionDocument(options: {
  readonly eventStore: DesktopWorkbenchEventStore;
  readonly persistedSessions: readonly WorkbenchSessionIndexEntry[];
}): Promise<{
  readonly events: readonly WorkbenchEvent[];
  readonly sessionIndex: WorkbenchSessionIndexSnapshot;
  readonly ignoredRecordCount: number;
  readonly activeSessionId: string;
}> {
  const sessionIndex = createWorkbenchSessionIndexFromEntries(options.persistedSessions);
  const activeSessionId = options.persistedSessions[0]?.id ?? "local-session-1";
  const events = await options.eventStore.list(activeSessionId);

  return {
    events,
    sessionIndex,
    ignoredRecordCount: 0,
    activeSessionId
  };
}

async function createInitialFixtureDocument(options: {
  readonly activeWorkspace: DesktopWorkspaceDescriptor;
  readonly eventStore: DesktopWorkbenchEventStore;
  readonly initialSessionId: string;
  readonly i18n: UiI18n;
  readonly languageSettings: WorkbenchLanguageSettings;
  readonly runner: ClaudeCodeFixtureReplayRunner;
  readonly sessionDefaults: WorkbenchSessionDefaults;
}): Promise<{
  readonly events: readonly WorkbenchEvent[];
  readonly sessionIndex: WorkbenchSessionIndexSnapshot;
  readonly ignoredRecordCount: number;
  readonly activeSessionId: string;
}> {
  const initialRun = await options.runner.run(
    createRunnerRequest({
      sessionId: options.initialSessionId,
      title: options.i18n.t("workbench.session.initialTitle"),
      prompt: options.i18n.t("workbench.session.initialPrompt"),
      languageSettings: options.languageSettings,
      sessionDefaults: options.sessionDefaults,
      workspacePath: options.activeWorkspace.path
    })
  );
  await options.eventStore.append(initialRun.events);

  return {
    events: initialRun.events,
    sessionIndex: buildWorkbenchSessionIndex(initialRun.events),
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
    externalSessionId: options.externalSessionId,
    modelAlias: options.sessionDefaults.defaultModelAlias,
    providerRouteId: options.sessionDefaults.defaultProviderRouteId,
    modelProfileId: options.sessionDefaults.defaultModelAlias,
    backendAdapterId: options.sessionDefaults.defaultBackendAdapterId,
    routingMode: options.sessionDefaults.routingMode,
    permissionMode:
      options.permissionModeOverride ?? options.sessionDefaults.defaultPermissionMode,
    uiLanguage: options.languageSettings.uiLanguage,
    agentResponseLanguage: normalizeAgentLanguageForRunner(
      options.languageSettings.agentResponseLanguage
    ),
    timeoutMs: 10 * 60 * 1000
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
