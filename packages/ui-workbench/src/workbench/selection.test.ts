import { describe, expect, it } from "vitest";

import {
  createEmptyBackendAdapterCapabilities,
  createSelectionReadiness,
  supportedCapability,
  unknownCapability,
  unavailableCapability,
  type BackendAdapterMetadata,
  type ModelProfileMetadata,
  type ProviderRouteMetadata,
  type WorkbenchSelectionSnapshot
} from "./selection.js";

describe("createSelectionReadiness", () => {
  it("blocks live execution when the provider route key presence is missing", () => {
    const readiness = createSelectionReadiness(
      createSelection({
        providerRoute: createProviderRoute({ hasApiKey: false })
      })
    );

    expect(readiness.level).toBe("blocked");
    expect(readiness.items).toContainEqual(
      expect.objectContaining({
        id: "provider-route",
        level: "blocked"
      })
    );
  });

  it("marks known manual routes ready when required metadata is present", () => {
    const readiness = createSelectionReadiness(createSelection());

    expect(readiness.level).toBe("ready");
    expect(readiness.summary).toBe(
      "Backend, provider route, model profile, and routing mode are ready."
    );
  });

  it("keeps unknown optional capabilities as attention instead of blockers", () => {
    const readiness = createSelectionReadiness(
      createSelection({
        backendAdapter: createBackendAdapter({
          approvals: unknownCapability("Approval forwarding is still being evaluated.")
        })
      })
    );

    expect(readiness.level).toBe("attention");
    expect(readiness.items).toContainEqual(
      expect.objectContaining({
        id: "backend-adapter",
        level: "attention"
      })
    );
  });

  it("blocks auto routing until the backend explicitly supports it", () => {
    const readiness = createSelectionReadiness(
      createSelection({
        routingMode: "auto",
        backendAdapter: createBackendAdapter({
          autoRouting: unavailableCapability("Auto routing policy is deferred.")
        })
      })
    );

    expect(readiness.level).toBe("blocked");
    expect(readiness.items).toContainEqual(
      expect.objectContaining({
        id: "routing-mode",
        level: "blocked"
      })
    );
  });
});

function createSelection(
  overrides: Partial<WorkbenchSelectionSnapshot> = {}
): WorkbenchSelectionSnapshot {
  const backendAdapter = overrides.backendAdapter ?? createBackendAdapter();
  const providerRoute = overrides.providerRoute ?? createProviderRoute({ hasApiKey: true });
  const modelProfile = overrides.modelProfile ?? createModelProfile();

  return {
    backendAdapterId: backendAdapter.id,
    providerRouteId: providerRoute.id,
    modelProfileId: modelProfile.id,
    routingMode: "manual",
    backendAdapter,
    providerRoute,
    modelProfile,
    ...overrides
  };
}

function createBackendAdapter(
  capabilities: Partial<BackendAdapterMetadata["capabilities"]> = {}
): BackendAdapterMetadata {
  return {
    id: "test.backend",
    label: "Test backend",
    kind: "external-cli",
    capabilities: {
      ...createEmptyBackendAdapterCapabilities(),
      sessions: supportedCapability(),
      terminalOutput: supportedCapability(),
      modelRouting: supportedCapability(),
      toolCalls: supportedCapability(),
      diffEvents: supportedCapability(),
      approvals: supportedCapability(),
      modelPicker: supportedCapability(),
      ...capabilities
    }
  };
}

function createProviderRoute(input: { readonly hasApiKey: boolean }): ProviderRouteMetadata {
  return {
    id: "test.route",
    providerId: "test",
    label: "Test route",
    kind: "anthropic-compatible",
    hasApiKey: input.hasApiKey,
    apiKeyState: input.hasApiKey ? "present" : "missing"
  };
}

function createModelProfile(): ModelProfileMetadata {
  return {
    id: "glm-test",
    label: "GLM Test",
    providerRouteId: "test.route",
    aliases: ["opus"],
    capabilities: ["coding", "streaming"],
    availability: supportedCapability()
  };
}
