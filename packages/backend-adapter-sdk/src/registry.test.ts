import { describe, expect, it } from "vitest";

import {
  createBackendAdapterOptions,
  createWorkbenchSelectionCatalog,
  describeBackendAdapter,
  resolveModelProfile,
  supportedCapability,
  type BackendAdapterMetadata
} from "./index.js";

describe("backend adapter registry helpers", () => {
  it("describes known and unknown backend adapters from a structural catalog", () => {
    const catalog = createWorkbenchSelectionCatalog({
      backendAdapters: [backendEntry]
    });

    expect(describeBackendAdapter(catalog, backendEntry.id).label).toBe("Test backend");
    expect(describeBackendAdapter(catalog, "missing.backend")).toMatchObject({
      id: "missing.backend",
      kind: "external-cli"
    });
  });

  it("creates backend adapter picker options without provider/model coupling", () => {
    const catalog = { backendAdapters: [backendEntry] };

    expect(createBackendAdapterOptions(catalog)).toEqual([
      {
        value: "test.backend",
        label: "Test backend",
        detail: "external-cli"
      }
    ]);
  });

  it("resolves model aliases when the full workbench catalog is available", () => {
    const catalog = createWorkbenchSelectionCatalog({
      modelProfiles: [
        {
          id: "glm-5.2",
          label: "GLM 5.2",
          providerRouteId: "zai.anthropic-compatible",
          aliases: ["opus"],
          capabilities: ["coding", "reasoning"],
          availability: supportedCapability()
        }
      ]
    });

    expect(resolveModelProfile(catalog, "opus")?.label).toBe("opus alias -> GLM 5.2");
  });
});

const backendEntry: BackendAdapterMetadata = {
  id: "test.backend",
  label: "Test backend",
  kind: "external-cli",
  capabilities: {
    sessions: supportedCapability(),
    resume: supportedCapability(),
    fork: supportedCapability(),
    toolCalls: supportedCapability(),
    terminalOutput: supportedCapability(),
    diffEvents: supportedCapability(),
    approvals: supportedCapability(),
    modelRouting: supportedCapability(),
    modelPicker: supportedCapability(),
    autoRouting: supportedCapability(),
    usageQuotaReporting: supportedCapability()
  }
};
