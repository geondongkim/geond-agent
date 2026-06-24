import { describe, expect, it } from "vitest";

import {
  createEmptyBackendAdapterCapabilities,
  createSelectionReadiness,
  supportedCapability,
  unavailableCapability,
  type BackendAdapterMetadata,
  type WorkbenchSelectionSnapshot
} from "./index.js";

describe("backend adapter selection readiness", () => {
  it("marks manual selections ready when backend, provider, and model metadata are available", () => {
    const readiness = createSelectionReadiness(createSelection());

    expect(readiness.level).toBe("ready");
    expect(readiness.items.map((item) => item.id)).toEqual([
      "backend-adapter",
      "provider-route",
      "model-profile",
      "routing-mode"
    ]);
  });

  it("blocks when a required backend capability is unavailable", () => {
    const readiness = createSelectionReadiness(
      createSelection({
        backendAdapter: createBackendAdapter({
          terminalOutput: unavailableCapability("Terminal streams are not exposed.")
        })
      })
    );

    expect(readiness.level).toBe("blocked");
    expect(readiness.summary).toContain("blocker");
  });

  it("marks external-auth provider routes as attention instead of asking geond-agent to store a key", () => {
    const readiness = createSelectionReadiness(
      createSelection({
        providerRoute: {
          id: "opencode.host-auth",
          providerId: "opencode",
          label: "OpenCode host auth",
          kind: "native-provider",
          hasApiKey: false,
          apiKeyState: "missing",
          authKind: "external-auth",
          authState: "external-required"
        }
      })
    );

    expect(readiness.level).toBe("attention");
    expect(readiness.items.find((item) => item.id === "provider-route")).toMatchObject({
      level: "attention",
      reason: "Authentication is mediated by the external backend or host tool."
    });
  });
});

function createSelection(
  overrides: Partial<WorkbenchSelectionSnapshot> = {}
): WorkbenchSelectionSnapshot {
  return {
    backendAdapterId: "mock.backend",
    providerRouteId: "mock.provider",
    modelProfileId: "mock.model",
    routingMode: "manual",
    backendAdapter: createBackendAdapter(),
    providerRoute: {
      id: "mock.provider",
      providerId: "mock",
      label: "Mock provider",
      kind: "local",
      hasApiKey: true,
      apiKeyState: "present"
    },
    modelProfile: {
      id: "mock.model",
      label: "Mock model",
      providerRouteId: "mock.provider",
      capabilities: ["coding"],
      availability: supportedCapability()
    },
    ...overrides
  };
}

function createBackendAdapter(
  capabilities: Partial<BackendAdapterMetadata["capabilities"]> = {}
): BackendAdapterMetadata {
  return {
    id: "mock.backend",
    label: "Mock backend",
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
