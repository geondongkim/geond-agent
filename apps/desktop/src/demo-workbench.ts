import {
  CLAUDE_CODE_SANITIZED_STREAM_JSON_FIXTURE,
  normalizeClaudeCodeStreamJsonRecords
} from "@geond-agent/claude-code-bridge";
import {
  createMemoryLocalSettingsStore,
  createWorkbenchSettingsLabels,
  LANGUAGE_SETTINGS_KEY,
  projectWorkbenchEvents,
  SESSION_DEFAULTS_SETTINGS_KEY,
  ZAI_PRE_SUBSCRIPTION_SAMPLE_EVENTS,
  type UiI18n,
  type WorkbenchProjection,
  type WorkbenchSettingsLabels,
  type WorkbenchSessionDefaults,
  type WorkbenchLanguageSettings,
  type WorkbenchPersistenceBoundary
} from "@geond-agent/ui-workbench";

import { createDesktopWorkbench } from "./index.js";

export interface DesktopDemoDocument {
  readonly i18n: UiI18n;
  readonly projection: WorkbenchProjection;
  readonly settingsLabels: WorkbenchSettingsLabels;
  readonly languageSettings: WorkbenchLanguageSettings;
  readonly sessionDefaults: WorkbenchSessionDefaults;
  readonly persistence: WorkbenchPersistenceBoundary;
  readonly providerSummary: string;
  readonly bridgeCommand: string;
  readonly ignoredRecordCount: number;
}

const DEMO_SETTINGS_SEED = {
  [LANGUAGE_SETTINGS_KEY]: JSON.stringify({
    uiLanguage: "ko",
    agentResponseLanguage: "en"
  }),
  [SESSION_DEFAULTS_SETTINGS_KEY]: JSON.stringify({
    defaultBackendAdapterId: "claude-code.external-cli-acp",
    defaultProviderRouteId: "zai.anthropic-compatible",
    defaultModelAlias: "sonnet",
    routingMode: "manual",
    approvalPolicy: "ask-first"
  })
} as const;

export async function createDesktopDemoDocument(): Promise<DesktopDemoDocument> {
  const settingsStore = createMemoryLocalSettingsStore(DEMO_SETTINGS_SEED);
  const workbench = await createDesktopWorkbench({
    settingsStore,
    systemLocales: ["ko-KR", "en-US"],
    workspacePath: "/Users/geondongkim/geond-agent"
  });
  const runtimeSnapshot = workbench.ui.getSnapshot();
  const normalizedClaude = normalizeClaudeCodeStreamJsonRecords(
    CLAUDE_CODE_SANITIZED_STREAM_JSON_FIXTURE
  );
  const projection = projectWorkbenchEvents(
    [...ZAI_PRE_SUBSCRIPTION_SAMPLE_EVENTS, ...normalizedClaude.events],
    undefined,
    {
      pinnedSessionIds: ["claude-workbench-1"]
    }
  );

  return {
    i18n: runtimeSnapshot.i18n,
    projection,
    settingsLabels: createWorkbenchSettingsLabels(runtimeSnapshot.i18n),
    languageSettings: runtimeSnapshot.languageSettings,
    sessionDefaults: workbench.sessionDefaults,
    persistence: workbench.persistence,
    providerSummary: workbench.providerSummary,
    bridgeCommand: [workbench.bridge.process.executable, ...workbench.bridge.process.args]
      .filter((value) => value.length > 0)
      .join(" "),
    ignoredRecordCount: normalizedClaude.ignoredRecords.length
  };
}
