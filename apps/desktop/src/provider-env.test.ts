import { describe, expect, it } from "vitest";

import { createZaiProviderConfig } from "@geond-agent/zai-provider";

import {
  mapLocalProviderMetadataToEnvironment,
  readLocalProviderEnvironment,
  type LocalProviderEnvironmentMetadata
} from "./provider-env.js";

function presentMetadata(): LocalProviderEnvironmentMetadata {
  return {
    hasZaiApiKey: true,
    hasAnthropicAuthToken: true,
    anthropicBaseUrl: "https://api.z.ai/api/anthropic",
    anthropicDefaultHaikuModel: "glm-4.7",
    anthropicDefaultSonnetModel: "glm-4.7",
    anthropicDefaultOpusModel: "glm-5.2"
  };
}

describe("mapLocalProviderMetadataToEnvironment", () => {
  it("substitutes a non-secret sentinel for a present Z.ai key so hasApiKey becomes true", () => {
    const environment = mapLocalProviderMetadataToEnvironment(presentMetadata());

    expect(environment.ZAI_API_KEY).toBe("(present)");
    expect(createZaiProviderConfig(environment).hasApiKey).toBe(true);
    expect(createZaiProviderConfig(environment).hasAnthropicKey).toBe(true);
  });

  it("routes the provider config through the non-secret model defaults and base URL", () => {
    const environment = mapLocalProviderMetadataToEnvironment(presentMetadata());
    const config = createZaiProviderConfig(environment);

    expect(config.anthropicBaseUrl).toBe("https://api.z.ai/api/anthropic");
    expect(config.routing.haiku).toBe("glm-4.7");
    expect(config.routing.sonnet).toBe("glm-4.7");
    expect(config.routing.opus).toBe("glm-5.2");
  });

  it("reports no key and a missing route when the metadata has no key present", () => {
    const environment = mapLocalProviderMetadataToEnvironment({
      hasZaiApiKey: false,
      hasAnthropicAuthToken: false
    });

    expect(environment.ZAI_API_KEY).toBeUndefined();
    expect(environment.ANTHROPIC_AUTH_TOKEN).toBeUndefined();
    expect(createZaiProviderConfig(environment).hasApiKey).toBe(false);
  });

  it("never surfaces a real secret value", () => {
    const environment = mapLocalProviderMetadataToEnvironment(presentMetadata());
    const serialized = JSON.stringify(environment);

    expect(serialized).not.toContain("super-secret");
    expect(environment.ZAI_API_KEY).toBe("(present)");
    expect(environment.ANTHROPIC_AUTH_TOKEN).toBe("(present)");
  });
});

describe("readLocalProviderEnvironment", () => {
  it("invokes the rust command with the workspace cwd and maps the response", async () => {
    let invoked: { readonly command: string; readonly args: unknown } | undefined;

    const environment = await readLocalProviderEnvironment("/workspace/path", {
      invokeFn: (async (command: string, args: unknown) => {
        invoked = { command, args };
        return presentMetadata();
      }) as typeof import("@tauri-apps/api/core").invoke
    });

    expect(invoked?.command).toBe("read_local_provider_environment");
    expect(invoked?.args).toEqual({ request: { cwd: "/workspace/path" } });
    expect(environment.ZAI_API_KEY).toBe("(present)");
    expect(createZaiProviderConfig(environment).hasApiKey).toBe(true);
  });

  it("passes a null cwd when no workspace is supplied", async () => {
    let invoked: { readonly args: unknown } | undefined;

    await readLocalProviderEnvironment(undefined, {
      invokeFn: (async (_command: string, args: unknown) => {
        invoked = { args };
        return presentMetadata();
      }) as typeof import("@tauri-apps/api/core").invoke
    });

    expect(invoked?.args).toEqual({ request: { cwd: null } });
  });
});
