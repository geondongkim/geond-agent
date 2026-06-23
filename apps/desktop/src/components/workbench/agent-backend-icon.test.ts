import { describe, expect, it } from "vitest";

import { getAgentBackendIconKind } from "./agent-backend-icon.js";

describe("getAgentBackendIconKind", () => {
  it("maps known backend routes to workbench icon families", () => {
    expect(getAgentBackendIconKind("claude-code.external-cli-acp", undefined)).toBe(
      "claude"
    );
    expect(getAgentBackendIconKind("codex.ide-plugin", undefined)).toBe("codex");
    expect(getAgentBackendIconKind("opencode.external-cli", undefined)).toBe("opencode");
    expect(getAgentBackendIconKind("antigravity.external-cli", undefined)).toBe(
      "antigravity"
    );
  });

  it("falls back to generic agent metadata", () => {
    expect(getAgentBackendIconKind(undefined, "Future local model backend")).toBe(
      "generic"
    );
  });
});
