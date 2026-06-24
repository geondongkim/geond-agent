import {
  supportedCapability,
  unavailableCapability,
  unknownCapability,
  type BackendAdapterMetadata,
  type ExecutionPolicyId,
  type ModelProfileMetadata,
  type ProviderRouteMetadata
} from "@geond-agent/backend-adapter-sdk";

export const OPENCODE_BACKEND_ID = "opencode.cli.metadata";
export const OPENCODE_HOST_AUTH_PROVIDER_ROUTE_ID = "opencode.host-auth";
export const OPENCODE_MODEL_PROFILE_ID = "opencode.selected-model";

export const OPENCODE_EXECUTION_POLICIES: readonly ExecutionPolicyId[] = [
  "plan",
  "ask-first",
  "accept-edits"
];

export function createOpenCodeBackendRegistryEntry(): BackendAdapterMetadata {
  return {
    id: OPENCODE_BACKEND_ID,
    label: "OpenCode CLI metadata candidate",
    kind: "external-cli",
    capabilities: {
      sessions: unknownCapability("OpenCode ACP/session behavior needs live adapter validation."),
      resume: unknownCapability("Resume semantics must be mapped before implementation."),
      fork: unknownCapability("Fork behavior is not evaluated."),
      toolCalls: unknownCapability("Tool call event shape is not normalized yet."),
      terminalOutput: supportedCapability(),
      diffEvents: unknownCapability("Permission diff prompts need adapter mapping."),
      approvals: unknownCapability("Approval queue semantics need adapter mapping."),
      modelRouting: unknownCapability("OpenCode can select provider/model, but geond-agent routing is not wired yet."),
      modelPicker: unknownCapability("Model picker support needs live product validation."),
      autoRouting: unavailableCapability("Auto routing policy is deferred."),
      usageQuotaReporting: unknownCapability("Usage/quota metadata needs live validation.")
    },
    notes: [
      "Metadata-only research boundary; no OpenCode process is launched.",
      "No OpenCode source, generated bundles, credentials, raw logs, or local session files are copied.",
      "Use SDK model variant and external-auth metadata before adding a real runner."
    ]
  };
}

export function createOpenCodeHostAuthProviderRoute(): ProviderRouteMetadata {
  return {
    id: OPENCODE_HOST_AUTH_PROVIDER_ROUTE_ID,
    providerId: "opencode",
    label: "OpenCode host-mediated provider route",
    kind: "native-provider",
    hasApiKey: false,
    apiKeyState: "missing",
    authKind: "external-auth",
    authState: "external-required",
    notes: [
      "Authentication belongs to the installed OpenCode tool or host integration.",
      "geond-agent stores metadata only and must not persist provider account state."
    ]
  };
}

export function createOpenCodeSelectedModelProfile(): ModelProfileMetadata {
  return {
    id: OPENCODE_MODEL_PROFILE_ID,
    label: "OpenCode selected model",
    providerRouteId: OPENCODE_HOST_AUTH_PROVIDER_ROUTE_ID,
    aliases: ["opencode-auto"],
    defaultVariantId: "opencode-agent",
    variants: [
      {
        id: "opencode-agent",
        label: "Agent mode",
        mode: "agent",
        reasoningMode: "provider-default",
        notes: ["Represents the model/mode currently selected inside OpenCode."]
      },
      {
        id: "opencode-plan",
        label: "Plan mode",
        mode: "plan",
        reasoningMode: "provider-default",
        notes: ["Use for permission-first planning before write actions."]
      },
      {
        id: "opencode-review",
        label: "Review mode",
        mode: "review",
        reasoningMode: "provider-default",
        notes: ["Use for diff/review sessions when a real adapter exists."]
      }
    ],
    capabilities: ["coding", "tool-calling", "streaming"],
    availability: unknownCapability("Depends on the installed OpenCode setup and selected provider."),
    notes: [
      "This is a host-selected model placeholder, not a concrete provider model id.",
      "Concrete provider/model catalogs should stay separate from backend metadata."
    ]
  };
}
