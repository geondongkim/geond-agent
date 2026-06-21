import { describe, expect, it } from "vitest";

import {
  DEFAULT_WORKBENCH_PERSISTENCE_BOUNDARY,
  DEFAULT_WORKBENCH_SESSION_DEFAULTS,
  loadWorkbenchSessionDefaults,
  normalizeWorkbenchSessionDefaults,
  saveWorkbenchSessionDefaults
} from "./session-defaults.js";
import { createMemoryLocalSettingsStore } from "./local-settings-store.js";

describe("normalizeWorkbenchSessionDefaults", () => {
  it("falls back to documented defaults when values are missing or invalid", () => {
    expect(
      normalizeWorkbenchSessionDefaults({
        defaultBackendAdapterId: "",
        defaultProviderRouteId: "   ",
        defaultModelAlias: null,
        routingMode: "unsupported",
        approvalPolicy: "nope"
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
        approvalPolicy: "ask-first"
      })
    ).toEqual({
      defaultBackendAdapterId: "claude-code.external-cli-acp",
      defaultProviderRouteId: "zai.anthropic-compatible",
      defaultModelAlias: "opus",
      routingMode: "auto",
      approvalPolicy: "ask-first"
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
      approvalPolicy: "ask-first"
    });

    await expect(loadWorkbenchSessionDefaults(store)).resolves.toEqual({
      defaultBackendAdapterId: "claude-code.external-cli-acp",
      defaultProviderRouteId: "zai.anthropic-compatible",
      defaultModelAlias: "opus",
      routingMode: "manual",
      approvalPolicy: "ask-first"
    });
  });
});
