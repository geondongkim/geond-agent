import {
  createClaudeCodeSelectionCatalog
} from "@geond-agent/claude-code-bridge";
import type {
  WorkbenchSelectionCatalog
} from "@geond-agent/ui-workbench";
import type { ZaiProviderConfig } from "@geond-agent/zai-provider";

export function createDesktopWorkbenchCatalog(
  providerConfig?: Pick<ZaiProviderConfig, "hasApiKey">
): WorkbenchSelectionCatalog {
  return createClaudeCodeSelectionCatalog({
    hasAnthropicKey: providerConfig?.hasApiKey,
    hasOpenAiKey: providerConfig?.hasApiKey
  });
}
