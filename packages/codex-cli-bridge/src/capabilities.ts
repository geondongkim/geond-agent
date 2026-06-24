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
      sessions: supportedCapability(),
      resume: unknownCapability("Codex exec resume is available, but live continuity needs validation."),
      fork: unknownCapability("Fork behavior is not evaluated."),
      toolCalls: unknownCapability("Tool call JSONL shape needs live validation."),
      terminalOutput: supportedCapability(),
      diffEvents: unknownCapability("Diff JSONL shape is modeled by sanitized fixtures only."),
      approvals: unknownCapability("Approval queue semantics need live adapter mapping."),
      modelRouting: unknownCapability("Provider/model routing depends on the installed Codex setup."),
      modelPicker: supportedCapability(),
      autoRouting: unavailableCapability("Auto routing policy is deferred."),
      usageQuotaReporting: unknownCapability("Usage/quota metadata needs live validation.")
    },
    notes: [
      "Runner boundary and sanitized JSONL fixture replay exist; desktop native process launch is not wired yet.",
      "No Codex source, app assets, VS Code extension bundles, credentials, or local session files are copied.",
      "Use SDK ExecutionPolicy metadata and Codex exec JSONL before adding a native process bridge."
    ]
  };
}
