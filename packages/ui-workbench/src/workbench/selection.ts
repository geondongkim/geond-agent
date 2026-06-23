import type { SupportedUiLanguage } from "../i18n/index.js";
import type { AgentResponseLanguage } from "../settings/index.js";

export type BackendAdapterKind =
  | "claude-code"
  | "acp-compatible"
  | "external-cli"
  | "ide-plugin"
  | "provider-router"
  | "local-model"
  | "sdk-like";

export type CapabilityState = "supported" | "unsupported" | "unavailable" | "unknown";

export interface CapabilityStatus {
  readonly state: CapabilityState;
  readonly reason?: string;
}

export interface BackendAdapterCapabilities {
  readonly sessions: CapabilityStatus;
  readonly resume: CapabilityStatus;
  readonly fork: CapabilityStatus;
  readonly toolCalls: CapabilityStatus;
  readonly terminalOutput: CapabilityStatus;
  readonly diffEvents: CapabilityStatus;
  readonly approvals: CapabilityStatus;
  readonly modelRouting: CapabilityStatus;
  readonly modelPicker: CapabilityStatus;
  readonly autoRouting: CapabilityStatus;
  readonly usageQuotaReporting: CapabilityStatus;
}

export interface BackendAdapterMetadata {
  readonly id: string;
  readonly label: string;
  readonly kind: BackendAdapterKind;
  readonly capabilities: BackendAdapterCapabilities;
  readonly notes?: readonly string[];
}

export type ProviderRouteKind =
  | "anthropic-compatible"
  | "openai-compatible"
  | "native-provider"
  | "local";

export interface ProviderRouteMetadata {
  readonly id: string;
  readonly providerId: string;
  readonly label: string;
  readonly kind: ProviderRouteKind;
  readonly endpoint?: string;
  readonly hasApiKey: boolean;
  readonly apiKeyState: "present" | "missing";
  readonly notes?: readonly string[];
}

export type ModelProfileCapability =
  | "tool-calling"
  | "reasoning"
  | "thinking"
  | "vision"
  | "streaming"
  | "coding";

export interface ModelProfileMetadata {
  readonly id: string;
  readonly label: string;
  readonly providerRouteId: string;
  readonly aliases?: readonly string[];
  readonly capabilities: readonly ModelProfileCapability[];
  readonly contextWindowTokens?: number;
  readonly availability: CapabilityStatus;
  readonly notes?: readonly string[];
}

export type RoutingMode = "manual" | "auto";

export type SelectionReadinessLevel = "ready" | "attention" | "blocked" | "unknown";

export interface SelectionReadinessItem {
  readonly id: string;
  readonly label: string;
  readonly level: SelectionReadinessLevel;
  readonly reason?: string;
}

export interface WorkbenchSelectionReadiness {
  readonly level: SelectionReadinessLevel;
  readonly summary: string;
  readonly items: readonly SelectionReadinessItem[];
}

export interface WorkbenchSelectionSnapshot {
  readonly backendAdapterId: string;
  readonly providerRouteId?: string;
  readonly modelProfileId?: string;
  readonly routingMode: RoutingMode;
  readonly backendAdapter?: BackendAdapterMetadata;
  readonly providerRoute?: ProviderRouteMetadata;
  readonly modelProfile?: ModelProfileMetadata;
  readonly uiLanguage?: SupportedUiLanguage;
  readonly agentResponseLanguage?: AgentResponseLanguage;
  readonly capabilityWarnings?: readonly string[];
  readonly readiness?: WorkbenchSelectionReadiness;
}

export function supportedCapability(): CapabilityStatus {
  return { state: "supported" };
}

export function unsupportedCapability(reason: string): CapabilityStatus {
  return { state: "unsupported", reason };
}

export function unavailableCapability(reason: string): CapabilityStatus {
  return { state: "unavailable", reason };
}

export function unknownCapability(reason = "Capability has not been evaluated yet."): CapabilityStatus {
  return { state: "unknown", reason };
}

export function createEmptyBackendAdapterCapabilities(): BackendAdapterCapabilities {
  return {
    sessions: unknownCapability(),
    resume: unknownCapability(),
    fork: unknownCapability(),
    toolCalls: unknownCapability(),
    terminalOutput: unknownCapability(),
    diffEvents: unknownCapability(),
    approvals: unknownCapability(),
    modelRouting: unknownCapability(),
    modelPicker: unknownCapability(),
    autoRouting: unknownCapability(),
    usageQuotaReporting: unknownCapability()
  };
}

export function createSelectionReadiness(
  selection: WorkbenchSelectionSnapshot
): WorkbenchSelectionReadiness {
  const items = [
    createBackendReadinessItem(selection),
    createProviderRouteReadinessItem(selection),
    createModelProfileReadinessItem(selection),
    createRoutingReadinessItem(selection)
  ];
  const level = summarizeReadinessLevel(items.map((item) => item.level));

  return {
    level,
    summary: createReadinessSummary(level, items),
    items
  };
}

function createBackendReadinessItem(
  selection: WorkbenchSelectionSnapshot
): SelectionReadinessItem {
  const backend = selection.backendAdapter;
  if (!backend) {
    return {
      id: "backend-adapter",
      label: "Backend adapter",
      level: "blocked",
      reason: `Unknown backend adapter: ${selection.backendAdapterId}`
    };
  }

  const requiredCapabilities = [
    backend.capabilities.sessions,
    backend.capabilities.terminalOutput,
    backend.capabilities.modelRouting
  ];
  const blockingCapability = requiredCapabilities.find((capability) =>
    capability.state === "unsupported" || capability.state === "unavailable"
  );
  if (blockingCapability) {
    return {
      id: "backend-adapter",
      label: backend.label,
      level: "blocked",
      reason: blockingCapability.reason ?? "A required backend capability is unavailable."
    };
  }

  const uncertainCapability = [
    ...requiredCapabilities,
    backend.capabilities.toolCalls,
    backend.capabilities.diffEvents,
    backend.capabilities.approvals
  ].find((capability) => capability.state === "unknown");

  return {
    id: "backend-adapter",
    label: backend.label,
    level: uncertainCapability ? "attention" : "ready",
    reason: uncertainCapability?.reason
  };
}

function createProviderRouteReadinessItem(
  selection: WorkbenchSelectionSnapshot
): SelectionReadinessItem {
  const route = selection.providerRoute;
  if (!route) {
    return {
      id: "provider-route",
      label: "Provider route",
      level: "blocked",
      reason: "No provider route is selected for this session."
    };
  }

  if (route.apiKeyState === "missing") {
    return {
      id: "provider-route",
      label: route.label,
      level: "blocked",
      reason: `${route.label} API key presence is missing in local runtime metadata.`
    };
  }

  return {
    id: "provider-route",
    label: route.label,
    level: "ready",
    reason: "API key presence is available as a boolean only; the key value is not stored."
  };
}

function createModelProfileReadinessItem(
  selection: WorkbenchSelectionSnapshot
): SelectionReadinessItem {
  const profile = selection.modelProfile;
  if (!profile) {
    return {
      id: "model-profile",
      label: "Model profile",
      level: "blocked",
      reason: selection.modelProfileId
        ? `Unknown model profile or alias: ${selection.modelProfileId}`
        : "No model profile is selected for this session."
    };
  }

  return {
    id: "model-profile",
    label: profile.label,
    level: mapCapabilityToReadiness(profile.availability, {
      unsupportedLevel: "blocked",
      unavailableLevel: "blocked",
      unknownLevel: "attention"
    }),
    reason: profile.availability.reason
  };
}

function createRoutingReadinessItem(
  selection: WorkbenchSelectionSnapshot
): SelectionReadinessItem {
  if (selection.routingMode === "manual") {
    return {
      id: "routing-mode",
      label: "Manual routing",
      level: "ready",
      reason: "The selected backend/provider/model snapshot is fixed for the session."
    };
  }

  const autoRouting = selection.backendAdapter?.capabilities.autoRouting;
  if (!autoRouting || autoRouting.state !== "supported") {
    return {
      id: "routing-mode",
      label: "Auto routing",
      level: "blocked",
      reason: autoRouting?.reason ?? "Auto routing capability is not available."
    };
  }

  return {
    id: "routing-mode",
    label: "Auto routing",
    level: "ready",
    reason: autoRouting.reason
  };
}

function mapCapabilityToReadiness(
  capability: CapabilityStatus,
  levels: {
    readonly unsupportedLevel: SelectionReadinessLevel;
    readonly unavailableLevel: SelectionReadinessLevel;
    readonly unknownLevel: SelectionReadinessLevel;
  }
): SelectionReadinessLevel {
  switch (capability.state) {
    case "supported":
      return "ready";
    case "unsupported":
      return levels.unsupportedLevel;
    case "unavailable":
      return levels.unavailableLevel;
    case "unknown":
      return levels.unknownLevel;
  }
}

function summarizeReadinessLevel(
  levels: readonly SelectionReadinessLevel[]
): SelectionReadinessLevel {
  if (levels.includes("blocked")) {
    return "blocked";
  }

  if (levels.includes("attention")) {
    return "attention";
  }

  if (levels.includes("unknown")) {
    return "unknown";
  }

  return "ready";
}

function createReadinessSummary(
  level: SelectionReadinessLevel,
  items: readonly SelectionReadinessItem[]
): string {
  const blockers = items.filter((item) => item.level === "blocked").length;
  const attention = items.filter((item) => item.level === "attention").length;

  switch (level) {
    case "ready":
      return "Backend, provider route, model profile, and routing mode are ready.";
    case "attention":
      return `${attention} readiness item${attention === 1 ? "" : "s"} need attention before this route is considered stable.`;
    case "blocked":
      return `${blockers} readiness blocker${blockers === 1 ? "" : "s"} must be resolved before live execution.`;
    case "unknown":
      return "Readiness is unknown because no blocking or ready metadata was available.";
  }
}
