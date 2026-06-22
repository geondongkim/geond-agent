import {
  createWorkbenchRuntime,
  loadWorkbenchSessionDefaults,
  validateWorkbenchSessionDefaults,
  type LocalSettingsStore,
  type WorkbenchPersistenceBoundary,
  type WorkbenchSessionDefaults,
  type WorkbenchRuntime,
  type WorkbenchSelectionCatalog
} from "@geond-agent/ui-workbench";
import {
  createZaiAnthropicCompatibleEnvironment,
  createZaiProviderConfig,
  describeZaiProviderConfig,
  type ZaiProviderEnvironment
} from "@geond-agent/zai-provider";
import {
  defineClaudeCodeAcpBoundary,
  redactClaudeCodeAcpBoundary,
  type ClaudeCodeAcpBoundary
} from "@geond-agent/claude-code-bridge";
import { desktopPersistenceBoundary } from "./persistence/schema.js";
import { createDesktopWorkbenchCatalog } from "./lib/workbench-catalog.js";

export * from "./persistence/materialized-event-store.js";

export type DesktopFrameworkStatus = "tauri-v2";

export interface DesktopAppBoundary {
  readonly frameworkStatus: DesktopFrameworkStatus;
  readonly ownsNativeShell: true;
  readonly storesProviderSecrets: false;
}

export const desktopAppBoundary: DesktopAppBoundary = {
  frameworkStatus: "tauri-v2",
  ownsNativeShell: true,
  storesProviderSecrets: false
};

export interface DesktopWorkbenchOptions {
  readonly settingsStore: LocalSettingsStore;
  readonly systemLocales?: string | readonly string[];
  readonly workspacePath?: string;
  readonly environment?: ZaiProviderEnvironment;
}

export interface DesktopWorkbench {
  readonly boundary: DesktopAppBoundary;
  readonly ui: WorkbenchRuntime;
  readonly bridge: ClaudeCodeAcpBoundary;
  readonly providerSummary: string;
  readonly sessionDefaults: WorkbenchSessionDefaults;
  readonly sessionDefaultWarnings: readonly string[];
  readonly selectionCatalog: WorkbenchSelectionCatalog;
  readonly persistence: WorkbenchPersistenceBoundary;
}

export async function createDesktopWorkbench(
  options: DesktopWorkbenchOptions
): Promise<DesktopWorkbench> {
  const ui = await createWorkbenchRuntime({
    settingsStore: options.settingsStore,
    systemLocales: options.systemLocales
  });
  const storedSessionDefaults = await loadWorkbenchSessionDefaults(options.settingsStore);
  const providerConfig = createZaiProviderConfig(options.environment);
  const selectionCatalog = createDesktopWorkbenchCatalog(providerConfig);
  const validatedSessionDefaults = validateWorkbenchSessionDefaults(
    storedSessionDefaults,
    selectionCatalog
  );
  const providerEnvironment = createZaiAnthropicCompatibleEnvironment(providerConfig);
  const bridge = defineClaudeCodeAcpBoundary({
    cwd: options.workspacePath,
    env: providerEnvironment
  });

  return {
    boundary: desktopAppBoundary,
    ui,
    bridge: redactClaudeCodeAcpBoundary(bridge),
    providerSummary: describeZaiProviderConfig(providerConfig),
    sessionDefaults: validatedSessionDefaults.defaults,
    sessionDefaultWarnings: validatedSessionDefaults.warnings,
    selectionCatalog,
    persistence: desktopPersistenceBoundary
  };
}
