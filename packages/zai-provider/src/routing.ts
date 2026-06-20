export const ZAI_ANTHROPIC_BASE_URL = "https://api.z.ai/api/anthropic";

export type ZaiCodingPlanModel = "glm-4.7" | "glm-5-turbo" | "glm-5.2";
export type AnthropicModelAlias = "haiku" | "sonnet" | "opus";
export type CodingTaskClass = "ordinary" | "hard";
export type ZaiRouteKey = AnthropicModelAlias | CodingTaskClass;

export const DEFAULT_ZAI_MODEL_ROUTING: Readonly<Record<ZaiRouteKey, ZaiCodingPlanModel>> = {
  haiku: "glm-4.7",
  sonnet: "glm-4.7",
  opus: "glm-5.2",
  ordinary: "glm-4.7",
  hard: "glm-5.2"
};

export interface ZaiModelRouting {
  readonly haiku: ZaiCodingPlanModel;
  readonly sonnet: ZaiCodingPlanModel;
  readonly opus: ZaiCodingPlanModel;
  readonly ordinary: ZaiCodingPlanModel;
  readonly hard: ZaiCodingPlanModel;
}

export function createZaiModelRouting(
  overrides: Partial<ZaiModelRouting> = {}
): ZaiModelRouting {
  return {
    haiku: overrides.haiku ?? DEFAULT_ZAI_MODEL_ROUTING.haiku,
    sonnet: overrides.sonnet ?? DEFAULT_ZAI_MODEL_ROUTING.sonnet,
    opus: overrides.opus ?? DEFAULT_ZAI_MODEL_ROUTING.opus,
    ordinary: overrides.ordinary ?? DEFAULT_ZAI_MODEL_ROUTING.ordinary,
    hard: overrides.hard ?? DEFAULT_ZAI_MODEL_ROUTING.hard
  };
}

export function resolveZaiModel(
  routeKey: ZaiRouteKey,
  routing: ZaiModelRouting = createZaiModelRouting()
): ZaiCodingPlanModel {
  return routing[routeKey];
}
