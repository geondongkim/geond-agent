import { describe, expect, it } from "vitest";

import {
  createBackendAdapterCatalog,
  createBackendAdapterOptions,
  createSelectionReadiness
} from "@geond-agent/backend-adapter-sdk";

import {
  OPENCODE_EXECUTION_POLICIES,
  OPENCODE_METADATA_FIXTURE_EVENTS,
  createOpenCodeBackendRegistryEntry,
  createOpenCodeHostAuthProviderRoute,
  createOpenCodeSelectedModelProfile
} from "./index.js";

describe("OpenCode metadata adapter", () => {
  it("describes a metadata-only backend without launching OpenCode", () => {
    const entry = createOpenCodeBackendRegistryEntry();

    expect(entry.kind).toBe("external-cli");
    expect(entry.capabilities.terminalOutput.state).toBe("supported");
    expect(entry.capabilities.toolCalls.state).toBe("unknown");
    expect(entry.notes?.join(" ")).toContain("no OpenCode process is launched");
  });

  it("uses SDK execution policy ids instead of tool-specific permission names", () => {
    expect(OPENCODE_EXECUTION_POLICIES).toEqual([
      "plan",
      "ask-first",
      "accept-edits"
    ]);
    expect(OPENCODE_EXECUTION_POLICIES).not.toContain("bypassPermissions");
  });

  it("can be listed through SDK backend catalog helpers", () => {
    const catalog = createBackendAdapterCatalog({
      backendAdapters: [createOpenCodeBackendRegistryEntry()]
    });

    expect(createBackendAdapterOptions(catalog)).toEqual([
      {
        value: "opencode.cli.metadata",
        label: "OpenCode CLI metadata candidate",
        detail: "external-cli"
      }
    ]);
  });

  it("models host-mediated auth and model mode selection without storing secrets", () => {
    const readiness = createSelectionReadiness({
      backendAdapterId: "opencode.cli.metadata",
      providerRouteId: "opencode.host-auth",
      modelProfileId: "opencode.selected-model",
      modelVariantId: "opencode-plan",
      modeProfileId: "opencode-plan",
      reasoningMode: "provider-default",
      routingMode: "manual",
      backendAdapter: createOpenCodeBackendRegistryEntry(),
      providerRoute: createOpenCodeHostAuthProviderRoute(),
      modelProfile: createOpenCodeSelectedModelProfile()
    });

    expect(readiness.level).toBe("attention");
    expect(readiness.items.find((item) => item.id === "provider-route")).toMatchObject({
      level: "attention"
    });
  });

  it("keeps sanitized fixture events correlated across diff and approval ids", () => {
    const diffEvent = OPENCODE_METADATA_FIXTURE_EVENTS.find((event) =>
      event.type === "diff.emitted"
    );
    const approvalEvent = OPENCODE_METADATA_FIXTURE_EVENTS.find((event) =>
      event.type === "approval.requested"
    );

    expect(diffEvent?.type).toBe("diff.emitted");
    expect(approvalEvent?.type).toBe("approval.requested");
    if (diffEvent?.type === "diff.emitted" && approvalEvent?.type === "approval.requested") {
      expect(approvalEvent.approval.diffId).toBe(diffEvent.diff.id);
    }
  });
});
