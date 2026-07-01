import { invoke } from "@tauri-apps/api/core";
import type { ZaiProviderEnvironment } from "@geond-agent/zai-provider";

/**
 * Non-secret value substituted for any present API key so the renderer can
 * build a provider config whose `hasApiKey` flag is accurate without the secret
 * ever crossing into the webview. `createZaiProviderConfig` only inspects key
 * fields for non-emptiness, so a stable placeholder is sufficient.
 */
const KEY_PRESENT_SENTINEL = "(present)";

export interface LocalProviderEnvironmentMetadata {
  readonly hasZaiApiKey: boolean;
  readonly hasAnthropicAuthToken: boolean;
  readonly anthropicBaseUrl?: string;
  readonly anthropicDefaultHaikuModel?: string;
  readonly anthropicDefaultSonnetModel?: string;
  readonly anthropicDefaultOpusModel?: string;
}

/**
 * Maps key-presence metadata (booleans only) into a `ZaiProviderEnvironment`,
 * replacing any present key with a non-secret sentinel. Non-secret routing
 * config (base URL, model defaults) is passed through unchanged.
 */
export function mapLocalProviderMetadataToEnvironment(
  metadata: LocalProviderEnvironmentMetadata
): ZaiProviderEnvironment {
  return {
    ZAI_API_KEY: metadata.hasZaiApiKey ? KEY_PRESENT_SENTINEL : undefined,
    ANTHROPIC_AUTH_TOKEN: metadata.hasAnthropicAuthToken ? KEY_PRESENT_SENTINEL : undefined,
    ANTHROPIC_BASE_URL: metadata.anthropicBaseUrl,
    ANTHROPIC_DEFAULT_HAIKU_MODEL: metadata.anthropicDefaultHaikuModel,
    ANTHROPIC_DEFAULT_SONNET_MODEL: metadata.anthropicDefaultSonnetModel,
    ANTHROPIC_DEFAULT_OPUS_MODEL: metadata.anthropicDefaultOpusModel
  };
}

/**
 * Reads provider-environment metadata for a workspace from the Rust side, which
 * parses the workspace `.env.local`. Returns a `ZaiProviderEnvironment` whose
 * key fields are presence sentinels (never the real secret). Returns undefined
 * when invoked outside the Tauri runtime (e.g. unit tests).
 */
export async function readLocalProviderEnvironment(
  cwd?: string,
  options: { readonly invokeFn?: typeof invoke } = {}
): Promise<ZaiProviderEnvironment> {
  const run = options.invokeFn ?? invoke;
  const metadata = await run<LocalProviderEnvironmentMetadata>(
    "read_local_provider_environment",
    { request: { cwd: cwd ?? null } }
  );
  return mapLocalProviderMetadataToEnvironment(metadata);
}
