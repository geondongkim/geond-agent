import { describe, expect, it } from "vitest";

import {
  DEFAULT_WORKBENCH_PERSISTENCE_BOUNDARY,
  DEFAULT_WORKBENCH_SESSION_DEFAULTS,
  loadWorkbenchSessionDefaults,
  normalizeWorkbenchSessionDefaults,
  saveWorkbenchSessionDefaults,
  validateWorkbenchSessionDefaults
} from "./session-defaults.js";
import { createMemoryLocalSettingsStore } from "./local-settings-store.js";
import {
  createWorkbenchSelectionCatalog,
  supportedCapability,
  unknownCapability
} from "../workbench/index.js";

describe("normalizeWorkbenchSessionDefaults", () => {
  it("falls back to documented defaults when values are missing or invalid", () => {
    expect(
      normalizeWorkbenchSessionDefaults({
        defaultBackendAdapterId: "",
        defaultProviderRouteId: "   ",
        defaultModelAlias: null,
        routingMode: "unsupported",
        defaultPermissionMode: "bypassPermissions",
        approvalPolicy: "nope",
        followUpPolicy: "replace",
        composerEnterBehavior: "space",
        reviewDelivery: "external"
      })
    ).toEqual(DEFAULT_WORKBENCH_SESSION_DEFAULTS);
  });

  it("keeps supported values and preserves the local-only persistence boundary", () => {
    expect(
      normalizeWorkbenchSessionDefaults({
        defaultBackendAdapterId: "claude-code.external-cli-acp",
        defaultProviderRouteId: "zai.anthropic-compatible",
        defaultModelAlias: "opus",
        routingMode: "auto",
        defaultPermissionMode: "acceptEdits",
        approvalPolicy: "ask-first",
        followUpPolicy: "interrupt",
        composerEnterBehavior: "enter",
        reviewDelivery: "detached"
      })
    ).toEqual({
      defaultBackendAdapterId: "claude-code.external-cli-acp",
      defaultProviderRouteId: "zai.anthropic-compatible",
      defaultModelAlias: "opus",
      routingMode: "auto",
      defaultPermissionMode: "acceptEdits",
      approvalPolicy: "ask-first",
      followUpPolicy: "interrupt",
      composerEnterBehavior: "enter",
      reviewDelivery: "detached"
    });

    expect(DEFAULT_WORKBENCH_PERSISTENCE_BOUNDARY.storesSecrets).toBe(false);
    expect(DEFAULT_WORKBENCH_PERSISTENCE_BOUNDARY.storesRawLogs).toBe(false);
  });
});

describe("Workbench session defaults persistence", () => {
  it("round-trips through the local settings store", async () => {
    const store = createMemoryLocalSettingsStore();

    await saveWorkbenchSessionDefaults(store, {
      defaultBackendAdapterId: "claude-code.external-cli-acp",
      defaultProviderRouteId: "zai.anthropic-compatible",
      defaultModelAlias: "opus",
      routingMode: "manual",
      defaultPermissionMode: "default",
      approvalPolicy: "ask-first",
      followUpPolicy: "steer",
      composerEnterBehavior: "modEnter",
      reviewDelivery: "inline"
    });

    await expect(loadWorkbenchSessionDefaults(store)).resolves.toEqual({
      defaultBackendAdapterId: "claude-code.external-cli-acp",
      defaultProviderRouteId: "zai.anthropic-compatible",
      defaultModelAlias: "opus",
      routingMode: "manual",
      defaultPermissionMode: "default",
      approvalPolicy: "ask-first",
      followUpPolicy: "steer",
      composerEnterBehavior: "modEnter",
      reviewDelivery: "inline"
    });
  });
});

describe("validateWorkbenchSessionDefaults", () => {
  it("falls back and reports warnings when persisted ids are no longer in the catalog", () => {
    const result = validateWorkbenchSessionDefaults(
      {
        defaultBackendAdapterId: "missing.backend",
        defaultProviderRouteId: "missing.route",
        defaultModelAlias: "missing-model",
        routingMode: "manual",
        defaultPermissionMode: "plan",
        approvalPolicy: "ask-first",
        followUpPolicy: "queue",
        composerEnterBehavior: "modEnter",
        reviewDelivery: "inline"
      },
      createWorkbenchSelectionCatalog({
        backendAdapters: [
          {
            id: DEFAULT_WORKBENCH_SESSION_DEFAULTS.defaultBackendAdapterId,
            label: "Claude Code external CLI/ACP candidate",
            kind: "claude-code",
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
          }
        ],
        providerRoutes: [
          {
            id: DEFAULT_WORKBENCH_SESSION_DEFAULTS.defaultProviderRouteId,
            providerId: "zai",
            label: "Z.ai Anthropic-compatible route",
            kind: "anthropic-compatible",
            hasApiKey: false,
            apiKeyState: "missing"
          }
        ],
        modelProfiles: [
          {
            id: "glm-4.7",
            label: "GLM 4.7",
            providerRouteId: DEFAULT_WORKBENCH_SESSION_DEFAULTS.defaultProviderRouteId,
            aliases: [DEFAULT_WORKBENCH_SESSION_DEFAULTS.defaultModelAlias],
            capabilities: ["coding"],
            availability: unknownCapability()
          }
        ]
      })
    );

    expect(result.defaults).toEqual(DEFAULT_WORKBENCH_SESSION_DEFAULTS);
    expect(result.warnings).toHaveLength(3);
  });
});
