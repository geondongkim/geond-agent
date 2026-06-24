import {
  createZaiProviderConfig,
  type ZaiProviderConfig,
  type ZaiProviderEnvironment
} from "./settings.js";
import {
  createZaiAnthropicCompatibleEnvironment,
  describeZaiProviderConfig
} from "./anthropic-env.js";
import {
  ZAI_ANTHROPIC_BASE_URL,
  createZaiModelRouting
} from "./routing.js";

/**
 * Compile-time / runtime-free fixture for the Z.ai provider empty-string
 * handling boundary.
 *
 * This package's `lint`, `test`, and `build` scripts run `tsc --noEmit`, so the
 * type assertions below are enforced at compile time. The pure helpers would
 * also hold at runtime if invoked, but they require no test runner.
 *
 * The fixture proves three things required by the evaluation task queue:
 *   1. Empty or whitespace-only `ANTHROPIC_BASE_URL` falls back to the default
 *      endpoint instead of overwriting it with an empty string.
 *   2. Empty or whitespace-only model alias env vars fall back to the default
 *      model routing.
 *   3. `hasApiKey` is `false` for empty or whitespace-only keys/tokens, and no
 *      helper ever exposes the real API key value.
 */

type AssertEqual<X, Y> =
  (<T>() => T extends X ? 1 : 2) extends (<T>() => T extends Y ? 1 : 2) ? true : false;

// `hasApiKey` is a boolean presence flag and can never carry the key value.
const _hasApiKeyIsBoolean: AssertEqual<ZaiProviderConfig["hasApiKey"], boolean> = true;
const _hasAnthropicKeyIsBoolean: AssertEqual<ZaiProviderConfig["hasAnthropicKey"], boolean> = true;
const _hasOpenAiKeyIsBoolean: AssertEqual<ZaiProviderConfig["hasOpenAiKey"], boolean> = true;

// The raw API key is intentionally not part of the provider config shape, so a
// future field that exposes it fails to compile.
const _configHasNoRawApiKeyField: AssertEqual<
  keyof ZaiProviderConfig,
  | "anthropicBaseUrl"
  | "routing"
  | "hasApiKey"
  | "hasAnthropicKey"
  | "hasOpenAiKey"
  | "route"
  | "openAiCompatibleRoute"
  | "modelProfiles"
> = true;

// A deliberately fake, non-functional marker used only to prove non-exposure.
const FAKE_API_KEY_MARKER = "zai-provider-fixture-fake-key-not-a-real-secret-0xKEY";

export const EMPTY_PROVIDER_VALUE_FIXTURES = ["", "   ", "\t", "\n", " \t \n "] as const;

export const DEFAULT_PROVIDER_ENVIRONMENT: ZaiProviderEnvironment = {};

export function verifyEmptyBaseUrlFallsBackToDefault(): void {
  for (const value of EMPTY_PROVIDER_VALUE_FIXTURES) {
    const config = createZaiProviderConfig({
      ...DEFAULT_PROVIDER_ENVIRONMENT,
      ANTHROPIC_BASE_URL: value
    });
    if (config.anthropicBaseUrl !== ZAI_ANTHROPIC_BASE_URL) {
      throw new Error(`Empty ANTHROPIC_BASE_URL leaked into config: ${JSON.stringify(value)}`);
    }
  }
}

export function verifyEmptyModelAliasesFallBackToDefaultRouting(): void {
  const defaultRouting = createZaiModelRouting();
  for (const value of EMPTY_PROVIDER_VALUE_FIXTURES) {
    const config = createZaiProviderConfig({
      ...DEFAULT_PROVIDER_ENVIRONMENT,
      ANTHROPIC_DEFAULT_HAIKU_MODEL: value,
      ANTHROPIC_DEFAULT_SONNET_MODEL: value,
      ANTHROPIC_DEFAULT_OPUS_MODEL: value
    });
    if (
      config.routing.haiku !== defaultRouting.haiku ||
      config.routing.sonnet !== defaultRouting.sonnet ||
      config.routing.opus !== defaultRouting.opus
    ) {
      throw new Error(`Empty model alias leaked into routing: ${JSON.stringify(value)}`);
    }
  }
}

export function verifyEmptyApiKeyReportsMissing(): void {
  for (const value of EMPTY_PROVIDER_VALUE_FIXTURES) {
    const config = createZaiProviderConfig({
      ...DEFAULT_PROVIDER_ENVIRONMENT,
      ANTHROPIC_AUTH_TOKEN: value,
      ZAI_API_KEY: value
    });
    if (config.hasApiKey) {
      throw new Error(`Empty Z.ai credential was reported as present: ${JSON.stringify(value)}`);
    }
  }
}

export function verifyNonEmptyApiKeyReportsPresent(): void {
  const zaiConfig = createZaiProviderConfig({
    ...DEFAULT_PROVIDER_ENVIRONMENT,
    ZAI_API_KEY: FAKE_API_KEY_MARKER
  });
  const anthropicConfig = createZaiProviderConfig({
    ...DEFAULT_PROVIDER_ENVIRONMENT,
    ANTHROPIC_AUTH_TOKEN: FAKE_API_KEY_MARKER
  });
  const openAiOnlyConfig = createZaiProviderConfig({
    ...DEFAULT_PROVIDER_ENVIRONMENT,
    OPENAI_API_KEY: FAKE_API_KEY_MARKER
  });
  if (
    !zaiConfig.hasApiKey ||
    !zaiConfig.hasAnthropicKey ||
    !zaiConfig.hasOpenAiKey ||
    !anthropicConfig.hasApiKey ||
    !anthropicConfig.hasAnthropicKey ||
    anthropicConfig.hasOpenAiKey ||
    !openAiOnlyConfig.hasApiKey ||
    openAiOnlyConfig.hasAnthropicKey ||
    !openAiOnlyConfig.hasOpenAiKey
  ) {
    throw new Error("Non-empty Z.ai credential was reported as missing");
  }
}

export function verifyConfigNeverExposesKeyValue(): void {
  const config = createZaiProviderConfig({
    ...DEFAULT_PROVIDER_ENVIRONMENT,
    ZAI_API_KEY: FAKE_API_KEY_MARKER
  });

  const anthropicEnv = createZaiAnthropicCompatibleEnvironment(config);
  const description = describeZaiProviderConfig(config);

  if (
    Object.hasOwn(anthropicEnv, "ZAI_API_KEY") ||
    Object.hasOwn(anthropicEnv, "ANTHROPIC_AUTH_TOKEN") ||
    JSON.stringify(anthropicEnv).includes(FAKE_API_KEY_MARKER) ||
    description.includes(FAKE_API_KEY_MARKER)
  ) {
    throw new Error("Provider helper exposed the API key value");
  }
}
