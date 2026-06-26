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
      resume: unknownCapability("Codex exec resume is available, but live continuity still needs dogfood validation."),
      fork: unknownCapability("Fork behavior is not evaluated."),
      toolCalls: unknownCapability("Tool call JSONL shape is normalized from SDK events and needs live validation."),
      terminalOutput: supportedCapability(),
      diffEvents: unknownCapability("Diff JSONL shape is normalized from SDK events and needs live validation."),
      approvals: unknownCapability("Approval queue semantics need live adapter mapping."),
      modelRouting: unknownCapability("Provider/model routing depends on the installed Codex setup."),
      modelPicker: supportedCapability(),
      autoRouting: unavailableCapability("Auto routing policy is deferred."),
      usageQuotaReporting: unknownCapability("Usage/quota metadata is normalized when Codex emits turn usage.")
    },
    notes: [
      "Runner boundary, sanitized JSONL fixture replay, and Tauri native process launch boundaries exist.",
      "No Codex source, app assets, VS Code extension bundles, credentials, or local session files are copied.",
      "Live Codex session continuity, approval shape, and tool/diff fidelity still need dogfood validation."
    ]
  };
}
