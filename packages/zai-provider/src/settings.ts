import {
  createZaiModelRouting,
  ZAI_ANTHROPIC_BASE_URL,
  isZaiModelProfileId,
  type ZaiModelRouting
} from "./routing.js";
import {
  createZaiAnthropicRouteMetadata,
  createZaiOpenAiRouteMetadata,
  listZaiModelProfiles,
  type ZaiAnthropicRouteMetadata,
  type ZaiModelProfile,
  type ZaiOpenAiCompatibleRouteMetadata
} from "./catalog.js";

export interface ZaiProviderEnvironment {
  readonly ZAI_API_KEY?: string;
  readonly ANTHROPIC_AUTH_TOKEN?: string;
  readonly ANTHROPIC_BASE_URL?: string;
  readonly ANTHROPIC_DEFAULT_HAIKU_MODEL?: string;
  readonly ANTHROPIC_DEFAULT_SONNET_MODEL?: string;
  readonly ANTHROPIC_DEFAULT_OPUS_MODEL?: string;
}

export interface ZaiProviderConfig {
  readonly anthropicBaseUrl: string;
  readonly routing: ZaiModelRouting;
  readonly hasApiKey: boolean;
  readonly route: ZaiAnthropicRouteMetadata;
  readonly openAiCompatibleRoute: ZaiOpenAiCompatibleRouteMetadata;
  readonly modelProfiles: readonly ZaiModelProfile[];
}

type ZaiModelRoutingOverrides = {
  -readonly [Key in keyof ZaiModelRouting]?: ZaiModelRouting[Key];
};

export function createZaiProviderConfig(
  environment: ZaiProviderEnvironment = {}
): ZaiProviderConfig {
  const routingOverrides: ZaiModelRoutingOverrides = {};
  const haikuModel = asZaiModel(readNonEmptyString(environment.ANTHROPIC_DEFAULT_HAIKU_MODEL));
  const sonnetModel = asZaiModel(readNonEmptyString(environment.ANTHROPIC_DEFAULT_SONNET_MODEL));
  const opusModel = asZaiModel(readNonEmptyString(environment.ANTHROPIC_DEFAULT_OPUS_MODEL));
  const anthropicBaseUrl =
    readNonEmptyString(environment.ANTHROPIC_BASE_URL) ?? ZAI_ANTHROPIC_BASE_URL;
  const hasApiKey =
    readNonEmptyString(environment.ZAI_API_KEY) !== undefined ||
    readNonEmptyString(environment.ANTHROPIC_AUTH_TOKEN) !== undefined;

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
    anthropicBaseUrl,
    routing: createZaiModelRouting(routingOverrides),
    hasApiKey,
    route: createZaiAnthropicRouteMetadata({
      endpoint: anthropicBaseUrl,
      hasApiKey
    }),
    openAiCompatibleRoute: createZaiOpenAiRouteMetadata({
      hasApiKey
    }),
    modelProfiles: listZaiModelProfiles()
  };
}

function asZaiModel(value: string | undefined): ZaiModelRouting[keyof ZaiModelRouting] | undefined {
  if (value && isZaiModelProfileId(value) && value !== "auto") {
    return value;
  }

  return undefined;
}

function readNonEmptyString(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : undefined;
}
