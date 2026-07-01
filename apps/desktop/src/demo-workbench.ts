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
  createCodexCliFixtureReplayRunner,
  createCodexCliProcessRunner,
  type CodexCliFixtureReplayRunner,
  type CodexCliProcessRunner,
  type CodexCliProcessRunnerResult,
  type CodexCliRunnerResult
} from "@geond-agent/codex-cli-bridge";
import {
  createWorkbenchSettingsLabels,
  createWorkbenchSessionController,
  buildWorkbenchSessionIndex,
  loadWorkbenchPinnedSessionIds,
  loadWorkbenchArchivedSessionIds,
  saveWorkbenchSessionDefaults,
  saveWorkbenchPinnedSessionIds,
  saveWorkbenchArchivedSessionIds,
  validateWorkbenchSessionDefaults,
  createWorkbenchSessionIndexFromEntries,
  createEmptyWorkbenchSessionIndex,
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

import {
  createTauriClaudeCodeExecutor,
  probeTauriClaudeCodeExecutable,
  type ClaudeCodeCliProbe
} from "./claude-runner.js";
import { createTauriCodexCliExecutor } from "./codex-runner.js";
import { createDesktopWorkbench } from "./index.js";
import { readLocalProviderEnvironment } from "./provider-env.js";
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
import {
  loadRecentContextItems,
  saveRecentContextItems,
  type RecentContextItem
} from "./lib/recent-context.js";
import {
  loadEvidenceExportPreferences,
  saveEvidenceExportPreferences,
  type EvidenceExportPreferences
} from "./lib/evidence-export-preferences.js";
import type { DesktopWorkspaceDescriptor } from "./workspace.js";
import {
  FALLBACK_WORKSPACE,
  createDesktopWorkspaceDescriptor,
  createDesktopWorkspaceResolver
} from "./workspace.js";

export type DesktopRunnerMode = "fixture" | "claude-live" | "codex-live";

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
  readonly codexRunner: CodexCliFixtureReplayRunner | CodexCliProcessRunner;
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
  readonly recentContextItems: readonly RecentContextItem[];
  readonly evidenceExportPreferences: EvidenceExportPreferences;
  readonly sessionDefaultWarnings: readonly string[];
  readonly selectionCatalog: WorkbenchSelectionCatalog;
  readonly persistence: WorkbenchPersistenceBoundary;
  readonly providerSummary: string;
  readonly bridgeCommand: string;
  readonly claudeCliProbe: ClaudeCodeCliProbe;
  readonly ignoredRecordCount: number;
  readonly pinnedSessionIds: readonly string[];
  readonly archivedSessionIds: readonly string[];
  readonly initialControllerSnapshot: WorkbenchSessionControllerSnapshot;
  readonly createRunnerRequest: (options: CreateRunnerRequestOptions) => ClaudeCodeRunnerRequest;
  readonly runSession: (
    mode: DesktopRunnerMode,
    request: ClaudeCodeRunnerRequest
  ) => Promise<
    | ClaudeCodeRunnerResult
    | ClaudeCodeProcessRunnerResult
    | CodexCliRunnerResult
    | CodexCliProcessRunnerResult
  >;
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
  readonly saveRecentContextItems: (
    items: readonly RecentContextItem[]
  ) => Promise<readonly RecentContextItem[]>;
  readonly saveEvidenceExportPreferences: (
    preferences: EvidenceExportPreferences
  ) => Promise<EvidenceExportPreferences>;
  readonly saveSessionDefaults: (
    settings: WorkbenchSessionDefaults
  ) => Promise<WorkbenchSessionDefaults>;
  readonly savePinnedSessionIds: (
    sessionIds: readonly string[]
  ) => Promise<readonly string[]>;
  readonly saveArchivedSessionIds: (
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
  const providerEnvironment = isTauriRuntime()
    ? await readLocalProviderEnvironment(activeWorkspace.path)
    : undefined;
  const workbench = await createDesktopWorkbench({
    settingsStore,
    systemLocales: navigator.languages,
    workspacePath: activeWorkspace.path,
    environment: providerEnvironment
  });
  const runtimeSnapshot = workbench.ui.getSnapshot();
  const savedRunnerMode = await loadSavedRunnerMode(settingsStore);
  const savedLayoutPreference = await loadSavedLayoutPreference(settingsStore);
  const savedSideChatDrafts = await loadSideChatDrafts(settingsStore);
  const savedRecentContextItems = await loadRecentContextItems(settingsStore);
  const savedEvidenceExportPreferences = await loadEvidenceExportPreferences(settingsStore);
  const runner = createClaudeCodeFixtureReplayRunner();
  const liveRunner = createClaudeCodeProcessRunner(createTauriClaudeCodeExecutor());
  const codexRunner = isTauriRuntime()
    ? createCodexCliProcessRunner(createTauriCodexCliExecutor())
    : createCodexCliFixtureReplayRunner();
  const claudeCliProbe = await probeTauriClaudeCodeExecutable();
  const eventStore = createDesktopWorkbenchEventStore();
  const materializedEventStore = createDesktopMaterializedEventStore();
  const sessionIndexStore = createDesktopWorkbenchSessionIndexStore();
  const persistedSessions = await sessionIndexStore.list();

  // Clean up pristine (empty) sessions
  const cleanedPersistedSessions = await cleanupPristineSessions({
    eventStore,
    persistedSessions
  });

  const initialDocument = cleanedPersistedSessions.length > 0
    ? await createPersistedSessionDocument({
        eventStore,
        persistedSessions: cleanedPersistedSessions
      })
    : createEmptyInitialDocument();
  sessionIndexStore.replaceMemoryIndex(initialDocument.sessionIndex);
  const savedPinnedSessionIds = await loadWorkbenchPinnedSessionIds(settingsStore);
  const pinnedSessionIds = savedPinnedSessionIds.length > 0 ? savedPinnedSessionIds : [];
  const savedArchivedSessionIds = await loadWorkbenchArchivedSessionIds(settingsStore);
  const archivedSessionIds = savedArchivedSessionIds.length > 0 ? savedArchivedSessionIds : [];
  const controller = createWorkbenchSessionController({
    initialEvents: initialDocument.events,
    initialSessionIndex: initialDocument.sessionIndex,
    pinnedSessionIds,
    activeSessionId: initialDocument.activeSessionId ?? undefined
  });

  return {
    runtime: workbench.ui,
    controller,
    runner,
    liveRunner,
    codexRunner,
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
    recentContextItems: savedRecentContextItems,
    evidenceExportPreferences: savedEvidenceExportPreferences,
    sessionDefaultWarnings: workbench.sessionDefaultWarnings,
    selectionCatalog: workbench.selectionCatalog,
    persistence: workbench.persistence,
    providerSummary: workbench.providerSummary,
    bridgeCommand: [workbench.bridge.process.executable, ...workbench.bridge.process.args]
      .filter((value) => value.length > 0)
      .join(" "),
    claudeCliProbe,
    ignoredRecordCount: initialDocument.ignoredRecordCount,
    pinnedSessionIds,
    archivedSessionIds,
    initialControllerSnapshot: controller.getSnapshot(),
    createRunnerRequest,
    runSession: (mode, request) =>
      mode === "claude-live"
        ? liveRunner.run(request)
        : mode === "codex-live"
          ? codexRunner.run(request)
          : runner.run(request),
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
    saveRecentContextItems: (items) => saveRecentContextItems(settingsStore, items),
    saveEvidenceExportPreferences: (preferences) =>
      saveEvidenceExportPreferences(settingsStore, preferences),
    saveSessionDefaults: async (settings) => {
      const validated = validateWorkbenchSessionDefaults(
        settings,
        workbench.selectionCatalog
      );
      await saveWorkbenchSessionDefaults(settingsStore, validated.defaults);
      return validated.defaults;
    },
    savePinnedSessionIds: (sessionIds) =>
      saveWorkbenchPinnedSessionIds(settingsStore, sessionIds),
    saveArchivedSessionIds: (sessionIds) =>
      saveWorkbenchArchivedSessionIds(settingsStore, sessionIds)
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
  return saved === "fixture" || saved === "claude-live" || saved === "codex-live"
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
  return mode === "claude-live" || mode === "codex-live" ? mode : "fixture";
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

async function cleanupPristineSessions(options: {
  readonly eventStore: DesktopWorkbenchEventStore;
  readonly persistedSessions: readonly WorkbenchSessionIndexEntry[];
}): Promise<readonly WorkbenchSessionIndexEntry[]> {
  const result: WorkbenchSessionIndexEntry[] = [];

  for (const entry of options.persistedSessions) {
    try {
      // Step 1: Filter candidates using session index data
      const isCandidate =
        (entry.lifecycle === "started" || entry.lifecycle === "created") &&
        entry.pendingApprovalCount === 0 &&
        entry.warningCount === 0 &&
        entry.errorCount === 0;

      if (!isCandidate) {
        // Non-candidates always survive
        result.push(entry);
        continue;
      }

      // Step 2: For candidates, check event types to determine if pristine
      const events = await options.eventStore.list(entry.id);
      const hasSignificantEvents = events.some(event =>
        event.type === "run.attempt.started" ||
        event.type === "assistant.text.delta" ||
        event.type === "assistant.text.completed" ||
        event.type === "user.message" ||
        event.type === "session.adapter.linked"
      );

      if (hasSignificantEvents) {
        // Candidates with significant events survive
        result.push(entry);
      } else {
        // Pristine candidates are deleted
        await options.eventStore.deleteSession(entry.id);
      }
    } catch (error) {
      // Skip this session on error but continue processing others
      console.error(`Failed to inspect session ${entry.id}:`, error);
      // On error, keep the session to be safe
      result.push(entry);
    }
  }

  return result;
}

function createEmptyInitialDocument(): {
  readonly events: readonly WorkbenchEvent[];
  readonly sessionIndex: WorkbenchSessionIndexSnapshot;
  readonly ignoredRecordCount: number;
  readonly activeSessionId: string | undefined;
} {
  return {
    events: [],
    sessionIndex: createEmptyWorkbenchSessionIndex(),
    ignoredRecordCount: 0,
    activeSessionId: undefined
  };
}

async function createPersistedSessionDocument(options: {
  readonly eventStore: DesktopWorkbenchEventStore;
  readonly persistedSessions: readonly WorkbenchSessionIndexEntry[];
}): Promise<{
  readonly events: readonly WorkbenchEvent[];
  readonly sessionIndex: WorkbenchSessionIndexSnapshot;
  readonly ignoredRecordCount: number;
  readonly activeSessionId: string | undefined;
}> {
  const sessionIndex = createWorkbenchSessionIndexFromEntries(options.persistedSessions);
  const activeSessionId = options.persistedSessions[0]?.id;
  const events = activeSessionId ? await options.eventStore.list(activeSessionId) : [];

  return {
    events,
    sessionIndex,
    ignoredRecordCount: 0,
    activeSessionId
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
