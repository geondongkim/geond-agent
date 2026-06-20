import {
  createZaiModelRouting,
  ZAI_ANTHROPIC_BASE_URL,
  type ZaiModelRouting
} from "./routing.js";

export interface ZaiProviderEnvironment {
  readonly ZAI_API_KEY?: string;
  readonly ANTHROPIC_BASE_URL?: string;
  readonly ANTHROPIC_DEFAULT_HAIKU_MODEL?: string;
  readonly ANTHROPIC_DEFAULT_SONNET_MODEL?: string;
  readonly ANTHROPIC_DEFAULT_OPUS_MODEL?: string;
}

export interface ZaiProviderConfig {
  readonly anthropicBaseUrl: string;
  readonly routing: ZaiModelRouting;
  readonly hasApiKey: boolean;
}

type ZaiModelRoutingOverrides = {
  -readonly [Key in keyof ZaiModelRouting]?: ZaiModelRouting[Key];
};

export function createZaiProviderConfig(
  environment: ZaiProviderEnvironment = {}
): ZaiProviderConfig {
  const routingOverrides: ZaiModelRoutingOverrides = {};
  const haikuModel = asZaiModel(environment.ANTHROPIC_DEFAULT_HAIKU_MODEL);
  const sonnetModel = asZaiModel(environment.ANTHROPIC_DEFAULT_SONNET_MODEL);
  const opusModel = asZaiModel(environment.ANTHROPIC_DEFAULT_OPUS_MODEL);

  if (haikuModel) {
    routingOverrides.haiku = haikuModel;
  }

  if (sonnetModel) {
    routingOverrides.sonnet = sonnetModel;
  }

  if (opusModel) {
    routingOverrides.opus = opusModel;
  }

  return {
    anthropicBaseUrl: environment.ANTHROPIC_BASE_URL ?? ZAI_ANTHROPIC_BASE_URL,
    routing: createZaiModelRouting(routingOverrides),
    hasApiKey: Boolean(environment.ZAI_API_KEY)
  };
}

function asZaiModel(value: string | undefined): ZaiModelRouting[keyof ZaiModelRouting] | undefined {
  if (value === "glm-4.7" || value === "glm-5-turbo" || value === "glm-5.2") {
    return value;
  }

  return undefined;
}
