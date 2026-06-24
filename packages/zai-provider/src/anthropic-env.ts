import type { ZaiProviderConfig } from "./settings.js";

export interface ZaiAnthropicCompatibleEnvironment {
  readonly [key: string]: string | undefined;
  readonly ANTHROPIC_BASE_URL: string;
  readonly ANTHROPIC_DEFAULT_HAIKU_MODEL: string;
  readonly ANTHROPIC_DEFAULT_SONNET_MODEL: string;
  readonly ANTHROPIC_DEFAULT_OPUS_MODEL: string;
}

export function createZaiAnthropicCompatibleEnvironment(
  config: ZaiProviderConfig
): ZaiAnthropicCompatibleEnvironment {
  return {
    ANTHROPIC_BASE_URL: config.anthropicBaseUrl,
    ANTHROPIC_DEFAULT_HAIKU_MODEL: config.routing.haiku,
    ANTHROPIC_DEFAULT_SONNET_MODEL: config.routing.sonnet,
    ANTHROPIC_DEFAULT_OPUS_MODEL: config.routing.opus
  };
}

export function describeZaiProviderConfig(config: ZaiProviderConfig): string {
  const keyState = config.hasApiKey ? "api-key-present" : "api-key-missing";
  const anthropicKeyState = config.hasAnthropicKey ? "anthropic-key-present" : "anthropic-key-missing";
  const openAiKeyState = config.hasOpenAiKey ? "openai-key-present" : "openai-key-missing";
  return [
    `base=${config.anthropicBaseUrl}`,
    `haiku=${config.routing.haiku}`,
    `sonnet=${config.routing.sonnet}`,
    `opus=${config.routing.opus}`,
    keyState,
    anthropicKeyState,
    openAiKeyState
  ].join(" ");
}
