import {
  createWorkbenchRuntime,
  type LocalSettingsStore,
  type WorkbenchRuntime
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

export type DesktopFrameworkStatus = "undecided";

export interface DesktopAppBoundary {
  readonly frameworkStatus: DesktopFrameworkStatus;
  readonly ownsNativeShell: true;
  readonly storesProviderSecrets: false;
}

export const desktopAppBoundary: DesktopAppBoundary = {
  frameworkStatus: "undecided",
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
}

export async function createDesktopWorkbench(
  options: DesktopWorkbenchOptions
): Promise<DesktopWorkbench> {
  const ui = await createWorkbenchRuntime({
    settingsStore: options.settingsStore,
    systemLocales: options.systemLocales
  });
  const providerConfig = createZaiProviderConfig(options.environment);
  const providerEnvironment = createZaiAnthropicCompatibleEnvironment(providerConfig);
  const bridge = defineClaudeCodeAcpBoundary({
    cwd: options.workspacePath,
    env: providerEnvironment
  });

  return {
    boundary: desktopAppBoundary,
    ui,
    bridge: redactClaudeCodeAcpBoundary(bridge),
    providerSummary: describeZaiProviderConfig(providerConfig)
  };
}
