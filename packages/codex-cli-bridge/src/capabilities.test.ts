import { describe, expect, it } from "vitest";

import {
  createBackendAdapterCatalog,
  createBackendAdapterOptions
} from "@geond-agent/backend-adapter-sdk";

import {
  CODEX_CLI_EXECUTION_POLICIES,
  createCodexCliBackendRegistryEntry
} from "./index.js";

describe("Codex CLI metadata adapter", () => {
  it("describes a metadata-only backend without launching Codex", () => {
    const entry = createCodexCliBackendRegistryEntry();

    expect(entry.kind).toBe("external-cli");
    expect(entry.capabilities.terminalOutput.state).toBe("supported");
    expect(entry.capabilities.toolCalls.state).toBe("unknown");
    expect(entry.notes?.join(" ")).toContain("no Codex process is launched");
  });

  it("uses SDK execution policy ids instead of Claude-specific permission names", () => {
    expect(CODEX_CLI_EXECUTION_POLICIES).toEqual([
      "plan",
      "ask-first",
      "accept-edits"
    ]);
    expect(CODEX_CLI_EXECUTION_POLICIES).not.toContain("bypassPermissions");
  });

  it("can be listed through SDK backend catalog helpers", () => {
    const catalog = createBackendAdapterCatalog({
      backendAdapters: [createCodexCliBackendRegistryEntry()]
    });

    expect(createBackendAdapterOptions(catalog)).toEqual([
      {
        value: "codex.cli.metadata",
        label: "Codex CLI metadata candidate",
        detail: "external-cli"
      }
    ]);
  });
});
