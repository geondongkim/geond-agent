import { describe, expect, it } from "vitest";

import {
  createBackendAdapterOptions,
  createModelProfileOptions,
  createProviderRouteOptions,
  createWorkbenchSelectionCatalog,
  describeBackendAdapter,
  describeProviderRoute,
  resolveModelProfile
} from "./registry.js";
import {
  supportedCapability,
  unknownCapability,
  type BackendAdapterMetadata,
  type ModelProfileMetadata,
  type ProviderRouteMetadata
} from "./selection.js";

describe("Workbench selection catalog", () => {
  it("resolves backend, provider, exact model, and alias metadata", () => {
    const catalog = createWorkbenchSelectionCatalog({
      backendAdapters: [backendEntry],
      providerRoutes: [providerRoute],
      modelProfiles: [modelProfile]
    });

    expect(describeBackendAdapter(catalog, backendEntry.id).label).toBe("Test backend");
    expect(describeProviderRoute(catalog, providerRoute.id)?.label).toBe("Test route");
    expect(resolveModelProfile(catalog, "glm-test")?.label).toBe("GLM Test");
    expect(resolveModelProfile(catalog, "opus")?.label).toBe("opus alias -> GLM Test");
  });

  it("creates safe fallbacks for unknown backend/provider/model ids", () => {
    const catalog = createWorkbenchSelectionCatalog();

    expect(describeBackendAdapter(catalog, "unknown.backend")).toMatchObject({
      id: "unknown.backend",
      label: "unknown.backend",
      kind: "external-cli"
    });
    expect(describeProviderRoute(catalog, "unknown.route")).toMatchObject({
      id: "unknown.route",
      providerId: "unknown",
      hasApiKey: false,
      apiKeyState: "missing"
    });
    expect(resolveModelProfile(catalog, "missing")).toBeUndefined();
  });

  it("builds select options from catalog entries instead of pane-local constants", () => {
    const catalog = createWorkbenchSelectionCatalog({
      backendAdapters: [backendEntry],
      providerRoutes: [providerRoute],
      modelProfiles: [modelProfile]
    });

    expect(createBackendAdapterOptions(catalog)).toEqual([
      { value: "test.backend", label: "Test backend", detail: "external-cli" }
    ]);
    expect(createProviderRouteOptions(catalog)).toEqual([
      { value: "test.route", label: "Test route", detail: "anthropic-compatible" }
    ]);
    expect(createModelProfileOptions(catalog)).toEqual([
      { value: "opus", label: "opus alias -> GLM Test", detail: "coding, streaming" },
      { value: "hard", label: "hard alias -> GLM Test", detail: "coding, streaming" }
    ]);
  });
});

const backendEntry: BackendAdapterMetadata = {
  id: "test.backend",
  label: "Test backend",
  kind: "external-cli",
  capabilities: {
    sessions: supportedCapability(),
    resume: unknownCapability(),
    fork: unknownCapability(),
    toolCalls: supportedCapability(),
    terminalOutput: supportedCapability(),
    diffEvents: supportedCapability(),
    approvals: unknownCapability(),
    modelRouting: supportedCapability(),
    modelPicker: supportedCapability(),
    autoRouting: unknownCapability(),
    usageQuotaReporting: unknownCapability()
  }
};

const providerRoute: ProviderRouteMetadata = {
  id: "test.route",
  providerId: "test",
  label: "Test route",
  kind: "anthropic-compatible",
  hasApiKey: false,
  apiKeyState: "missing"
};

const modelProfile: ModelProfileMetadata = {
  id: "glm-test",
  label: "GLM Test",
  providerRouteId: "test.route",
  aliases: ["opus", "hard"],
  capabilities: ["coding", "streaming"],
  availability: unknownCapability()
};
