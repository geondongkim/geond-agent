import {
  supportedCapability,
  unavailableCapability,
  unknownCapability,
  type BackendAdapterMetadata,
  type ExecutionPolicyId
} from "@geond-agent/backend-adapter-sdk";

export const CODEX_CLI_BACKEND_ID = "codex.cli.metadata";

export const CODEX_CLI_EXECUTION_POLICIES: readonly ExecutionPolicyId[] = [
  "plan",
  "ask-first",
  "accept-edits"
];

export function createCodexCliBackendRegistryEntry(): BackendAdapterMetadata {
  return {
    id: CODEX_CLI_BACKEND_ID,
    label: "Codex CLI metadata candidate",
    kind: "external-cli",
    capabilities: {
      sessions: unknownCapability("Session behavior needs live Codex CLI adapter validation."),
      resume: unknownCapability("Resume semantics must be probed before implementation."),
      fork: unknownCapability("Fork behavior is not evaluated."),
      toolCalls: unknownCapability("Tool call event shape is not normalized yet."),
      terminalOutput: supportedCapability(),
      diffEvents: unknownCapability("Diff event shape is not normalized yet."),
      approvals: unknownCapability("Approval queue semantics need adapter mapping."),
      modelRouting: unknownCapability("Provider/model routing depends on the installed Codex setup."),
      modelPicker: unknownCapability("Model picker support needs product/API research."),
      autoRouting: unavailableCapability("Auto routing policy is deferred."),
      usageQuotaReporting: unknownCapability("Usage/quota metadata needs live validation.")
    },
    notes: [
      "Metadata-only research boundary; no Codex process is launched.",
      "No Codex source, app assets, VS Code extension bundles, credentials, or local session files are copied.",
      "Use SDK ExecutionPolicy metadata before adding a real runner."
    ]
  };
}
