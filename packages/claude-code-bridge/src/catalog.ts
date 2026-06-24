import {
  createWorkbenchSelectionCatalog,
  type WorkbenchSelectionCatalog
} from "@geond-agent/backend-adapter-sdk";
import { createZaiCatalogEntries } from "@geond-agent/zai-provider";

import { createClaudeCodeBackendRegistryEntry } from "./capabilities.js";

export function createClaudeCodeSelectionCatalog(input: {
  readonly hasAnthropicKey?: boolean;
  readonly hasOpenAiKey?: boolean;
} = {}): WorkbenchSelectionCatalog {
  const zaiEntries = createZaiCatalogEntries({
    hasAnthropicKey: input.hasAnthropicKey,
    hasOpenAiKey: input.hasOpenAiKey
  });

  return createWorkbenchSelectionCatalog({
    backendAdapters: [createClaudeCodeBackendRegistryEntry()],
    providerRoutes: zaiEntries.providerRoutes,
    modelProfiles: zaiEntries.modelProfiles
  });
}
