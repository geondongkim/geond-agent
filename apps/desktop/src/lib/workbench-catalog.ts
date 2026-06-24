import {
  createClaudeCodeSelectionCatalog
} from "@geond-agent/claude-code-bridge";
import {
  createCodexCliBackendRegistryEntry
} from "@geond-agent/codex-cli-bridge";
import type {
  WorkbenchSelectionCatalog
} from "@geond-agent/ui-workbench";
import type { ZaiProviderConfig } from "@geond-agent/zai-provider";

export function createDesktopWorkbenchCatalog(
  providerConfig?: Partial<
    Pick<ZaiProviderConfig, "hasApiKey" | "hasAnthropicKey" | "hasOpenAiKey">
  >
): WorkbenchSelectionCatalog {
  const catalog = createClaudeCodeSelectionCatalog({
    hasAnthropicKey: providerConfig?.hasAnthropicKey ?? providerConfig?.hasApiKey,
    hasOpenAiKey: providerConfig?.hasOpenAiKey ?? providerConfig?.hasApiKey
  });

  return {
    ...catalog,
    backendAdapters: [
      ...catalog.backendAdapters,
      createCodexCliBackendRegistryEntry()
    ]
  };
}
