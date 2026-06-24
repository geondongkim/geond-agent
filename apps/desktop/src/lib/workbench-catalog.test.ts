import { describe, expect, it } from "vitest";

import {
  createBackendAdapterOptions,
  createModelProfileOptions,
  createProviderRouteOptions,
  resolveModelProfile
} from "@geond-agent/ui-workbench";

import { createDesktopWorkbenchCatalog } from "./workbench-catalog.js";

describe("desktop workbench catalog", () => {
  it("composes backend candidates with Z.ai provider route and model metadata", () => {
    const catalog = createDesktopWorkbenchCatalog({ hasApiKey: true });

    expect(createBackendAdapterOptions(catalog).map((option) => option.value)).toEqual([
      "claude-code.external-cli-acp",
      "codex.cli.metadata"
    ]);
    expect(createProviderRouteOptions(catalog).map((option) => option.value)).toEqual([
      "zai.anthropic-compatible",
      "zai.openai-compatible-coding"
    ]);
    expect(createModelProfileOptions(catalog).map((option) => option.value)).toContain("opus");
    expect(resolveModelProfile(catalog, "opus")?.label).toBe("opus alias -> GLM 5.2");
  });

  it("keeps Codex as a metadata-only backend candidate without changing provider routes", () => {
    const catalog = createDesktopWorkbenchCatalog({ hasApiKey: true });

    expect(catalog.backendAdapters).toContainEqual(
      expect.objectContaining({
        id: "codex.cli.metadata",
        kind: "external-cli",
        label: "Codex CLI metadata candidate"
      })
    );
    expect(catalog.providerRoutes.map((route) => route.id)).toEqual([
      "zai.anthropic-compatible",
      "zai.openai-compatible-coding"
    ]);
  });

  it("exposes only API key presence metadata, never a secret value", () => {
    const serialized = JSON.stringify(
      createDesktopWorkbenchCatalog({
        hasApiKey: true,
        hasAnthropicKey: true,
        hasOpenAiKey: true
      })
    );

    expect(serialized).toContain('"hasApiKey":true');
    expect(serialized).toContain('"apiKeyState":"present"');
    expect(serialized).not.toMatch(
      /ZAI_API_KEY|ANTHROPIC_API_KEY|ANTHROPIC_AUTH_TOKEN|sk-[A-Za-z0-9_-]{20,}/
    );
  });

  it("keeps Anthropic-compatible and OpenAI-compatible key presence separate", () => {
    const catalog = createDesktopWorkbenchCatalog({
      hasApiKey: true,
      hasAnthropicKey: true,
      hasOpenAiKey: false
    });

    expect(catalog.providerRoutes).toEqual([
      expect.objectContaining({
        id: "zai.anthropic-compatible",
        apiKeyState: "present"
      }),
      expect.objectContaining({
        id: "zai.openai-compatible-coding",
        apiKeyState: "missing"
      })
    ]);
  });
});
