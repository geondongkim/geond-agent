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

