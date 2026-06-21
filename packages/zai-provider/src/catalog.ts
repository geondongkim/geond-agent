import {
  ZAI_ANTHROPIC_BASE_URL,
  ZAI_CODING_OPENAI_BASE_URL,
  type ZaiModelProfileId
} from "./routing.js";
import {
  unknownCapability,
  type ModelProfileCapability,
  type ModelProfileMetadata,
  type ProviderRouteMetadata
} from "@geond-agent/ui-workbench";

export type ZaiReasoningCapability = "standard" | "thinking" | "reasoning" | "auto";

export interface ZaiModelProfile {
  readonly id: ZaiModelProfileId;
  readonly label: string;
  readonly routeAliases: readonly string[];
  readonly recommendedFor: readonly string[];
  readonly capabilities: {
    readonly coding: boolean;
    readonly toolCalling: boolean;
    readonly thinking: boolean;
    readonly reasoning: ZaiReasoningCapability;
    readonly anthropicCompatible: boolean;
    readonly openAiCompatible: boolean;
  };
  readonly notes?: readonly string[];
}

export interface ZaiAnthropicRouteMetadata {
  readonly id: "zai.anthropic-compatible";
  readonly providerId: "zai";
  readonly label: "Z.ai Anthropic-compatible route";
  readonly endpoint: string;
  readonly hasApiKey: boolean;
  readonly apiKeyState: "present" | "missing";
  readonly modelProfileIds: readonly ZaiModelProfileId[];
}

export interface ZaiOpenAiCompatibleRouteMetadata {
  readonly id: "zai.openai-compatible-coding";
  readonly providerId: "zai";
  readonly label: "Z.ai OpenAI-compatible coding route";
  readonly endpoint: string;
  readonly hasApiKey: boolean;
  readonly apiKeyState: "present" | "missing";
  readonly modelProfileIds: readonly ZaiModelProfileId[];
}

export interface ZaiCatalogEntries {
  readonly providerRoutes: readonly ProviderRouteMetadata[];
  readonly modelProfiles: readonly ModelProfileMetadata[];
}

export const ZAI_MODEL_PROFILES: readonly ZaiModelProfile[] = [
  {
    id: "glm-4.7",
    label: "GLM 4.7",
    routeAliases: ["haiku", "sonnet", "ordinary"],
    recommendedFor: ["ordinary coding loops", "long-running implementation"],
    capabilities: {
      coding: true,
      toolCalling: true,
      thinking: true,
      reasoning: "thinking",
      anthropicCompatible: true,
      openAiCompatible: true
    }
  },
  {
    id: "glm-5.2",
    label: "GLM 5.2",
    routeAliases: ["opus", "hard"],
    recommendedFor: ["hard coding tasks", "architecture-heavy changes"],
    capabilities: {
      coding: true,
      toolCalling: true,
      thinking: true,
      reasoning: "reasoning",
      anthropicCompatible: true,
      openAiCompatible: true
    }
  },
  {
    id: "glm-5-turbo",
    label: "GLM 5 Turbo",
    routeAliases: ["fast", "review"],
    recommendedFor: ["fast review passes", "low-latency coding assistance"],
    capabilities: {
      coding: true,
      toolCalling: true,
      thinking: false,
      reasoning: "standard",
      anthropicCompatible: true,
      openAiCompatible: true
    }
  },
  {
    id: "auto",
    label: "Auto",
    routeAliases: ["auto"],
    recommendedFor: ["future automatic routing based on task complexity and quota"],
    capabilities: {
      coding: true,
      toolCalling: true,
      thinking: true,
      reasoning: "auto",
      anthropicCompatible: true,
      openAiCompatible: true
    },
    notes: ["Pre-subscription helper only; no provider call is made to resolve auto."]
  }
];

export function listZaiModelProfiles(): readonly ZaiModelProfile[] {
  return ZAI_MODEL_PROFILES;
}

export function createZaiOpenAiRouteMetadata(input: {
  readonly endpoint?: string;
  readonly hasApiKey?: boolean;
} = {}): ZaiOpenAiCompatibleRouteMetadata {
  const hasApiKey = input.hasApiKey ?? false;

  return {
    id: "zai.openai-compatible-coding",
    providerId: "zai",
    label: "Z.ai OpenAI-compatible coding route",
    endpoint: input.endpoint ?? ZAI_CODING_OPENAI_BASE_URL,
    hasApiKey,
    apiKeyState: hasApiKey ? "present" : "missing",
    modelProfileIds: ZAI_MODEL_PROFILES.map((profile) => profile.id)
  };
}

export function getZaiModelProfile(id: ZaiModelProfileId): ZaiModelProfile | undefined {
  return ZAI_MODEL_PROFILES.find((profile) => profile.id === id);
}

export function createZaiAnthropicRouteMetadata(input: {
  readonly endpoint?: string;
  readonly hasApiKey?: boolean;
} = {}): ZaiAnthropicRouteMetadata {
  const hasApiKey = input.hasApiKey ?? false;

  return {
    id: "zai.anthropic-compatible",
    providerId: "zai",
    label: "Z.ai Anthropic-compatible route",
    endpoint: input.endpoint ?? ZAI_ANTHROPIC_BASE_URL,
    hasApiKey,
    apiKeyState: hasApiKey ? "present" : "missing",
    modelProfileIds: ZAI_MODEL_PROFILES.map((profile) => profile.id)
  };
}

export function createZaiCatalogEntries(input: {
  readonly hasAnthropicKey?: boolean;
  readonly hasOpenAiKey?: boolean;
  readonly anthropicEndpoint?: string;
  readonly openAiEndpoint?: string;
} = {}): ZaiCatalogEntries {
  const anthropicRoute = createZaiAnthropicRouteMetadata({
    endpoint: input.anthropicEndpoint,
    hasApiKey: input.hasAnthropicKey
  });
  const openAiRoute = createZaiOpenAiRouteMetadata({
    endpoint: input.openAiEndpoint,
    hasApiKey: input.hasOpenAiKey
  });

  return {
    providerRoutes: [
      {
        id: anthropicRoute.id,
        providerId: anthropicRoute.providerId,
        label: anthropicRoute.label,
        kind: "anthropic-compatible",
        endpoint: anthropicRoute.endpoint,
        hasApiKey: anthropicRoute.hasApiKey,
        apiKeyState: anthropicRoute.apiKeyState,
        notes: ["Anthropic-compatible route metadata only; no provider call is made."]
      },
      {
        id: openAiRoute.id,
        providerId: openAiRoute.providerId,
        label: openAiRoute.label,
        kind: "openai-compatible",
        endpoint: openAiRoute.endpoint,
        hasApiKey: openAiRoute.hasApiKey,
        apiKeyState: openAiRoute.apiKeyState,
        notes: ["OpenAI-compatible route metadata only; no provider call is made."]
      }
    ],
    modelProfiles: ZAI_MODEL_PROFILES.map((profile) => ({
      id: profile.id,
      label: profile.label,
      providerRouteId: anthropicRoute.id,
      aliases: profile.routeAliases,
      capabilities: toWorkbenchModelCapabilities(profile),
      availability: unknownCapability(
        "Availability depends on the selected Z.ai route and local API key presence."
      ),
      notes: [
        ...profile.recommendedFor.map((item) => `Recommended for ${item}.`),
        ...(profile.notes ?? [])
      ]
    }))
  };
}

function toWorkbenchModelCapabilities(
  profile: ZaiModelProfile
): readonly ModelProfileCapability[] {
  const capabilities: ModelProfileCapability[] = ["coding", "streaming"];

  if (profile.capabilities.toolCalling) {
    capabilities.push("tool-calling");
  }

  if (profile.capabilities.thinking) {
    capabilities.push("thinking");
  }

  if (profile.capabilities.reasoning === "reasoning") {
    capabilities.push("reasoning");
  }

  return capabilities;
}
