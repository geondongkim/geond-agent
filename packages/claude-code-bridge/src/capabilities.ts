import {
  supportedCapability,
  unavailableCapability,
  unknownCapability,
  type BackendAdapterMetadata
} from "@geond-agent/backend-adapter-sdk";

export type ClaudeCodeBridgeCapabilityState =
  | "supported"
  | "candidate"
  | "unsupported"
  | "unknown";

export interface ClaudeCodeBridgeCapabilityStatus {
  readonly state: ClaudeCodeBridgeCapabilityState;
  readonly reason?: string;
}

export interface ClaudeCodeAdapterCapabilities {
  readonly externalCli: ClaudeCodeBridgeCapabilityStatus;
  readonly acpTransport: ClaudeCodeBridgeCapabilityStatus;
  readonly sessions: ClaudeCodeBridgeCapabilityStatus;
  readonly resume: ClaudeCodeBridgeCapabilityStatus;
  readonly fork: ClaudeCodeBridgeCapabilityStatus;
  readonly toolCalls: ClaudeCodeBridgeCapabilityStatus;
  readonly terminalOutput: ClaudeCodeBridgeCapabilityStatus;
  readonly diffEvents: ClaudeCodeBridgeCapabilityStatus;
  readonly approvals: ClaudeCodeBridgeCapabilityStatus;
  readonly modelMetadata: ClaudeCodeBridgeCapabilityStatus;
  readonly modelRouting: ClaudeCodeBridgeCapabilityStatus;
  readonly usageQuotaReporting: ClaudeCodeBridgeCapabilityStatus;
}

export interface ClaudeCodeAdapterMetadata {
  readonly id: "claude-code.external-cli-acp";
  readonly label: "Claude Code external CLI/ACP candidate";
  readonly bundlesClaudeCode: false;
  readonly capabilities: ClaudeCodeAdapterCapabilities;
  readonly notes: readonly string[];
}

export function createClaudeCodeAdapterMetadata(
  overrides: Partial<ClaudeCodeAdapterCapabilities> = {}
): ClaudeCodeAdapterMetadata {
  return {
    id: "claude-code.external-cli-acp",
    label: "Claude Code external CLI/ACP candidate",
    bundlesClaudeCode: false,
    capabilities: {
      externalCli: supported("Claude Code is expected to be user-installed."),
      acpTransport: candidate("ACP behavior must be evaluated against the installed CLI."),
      sessions: supported("Live runs emit external session metadata when the CLI reports it."),
      resume: supported("Print-mode follow-up uses Claude Code --resume for continuation."),
      fork: unknown("Fork behavior needs installed-tool testing."),
      toolCalls: supported("Stream-json tool events are normalized before UI rendering."),
      terminalOutput: supported("Process stdout/stderr is streamed as workbench command output."),
      diffEvents: supported("Diff events and summaries are normalized for review surfaces."),
      approvals: candidate("Approval requests should be forwarded, not silently accepted."),
      modelMetadata: candidate("Model metadata may come from provider route helpers."),
      modelRouting: supported("Routing is delegated to provider metadata such as Z.ai helpers."),
      usageQuotaReporting: unknown("Depends on the external tool and provider response metadata."),
      ...overrides
    },
    notes: [
      "No Claude Code binary is bundled.",
      "No Claude Code internals are copied.",
      "This metadata describes an adapter prototype, not the whole backend abstraction."
    ]
  };
}

export function createClaudeCodeBackendRegistryEntry(): BackendAdapterMetadata {
  return {
    id: "claude-code.external-cli-acp",
    label: "Claude Code external CLI/ACP candidate",
    kind: "claude-code",
    capabilities: {
      sessions: supportedCapability(),
      resume: supportedCapability(),
      fork: unknownCapability("Fork behavior is still deferred."),
      toolCalls: supportedCapability(),
      terminalOutput: supportedCapability(),
      diffEvents: supportedCapability(),
      approvals: unknownCapability(
        "Approval forwarding needs a confirmed Claude Code permission event shape."
      ),
      modelRouting: supportedCapability(),
      modelPicker: supportedCapability(),
      autoRouting: unavailableCapability("Auto routing policy is deferred."),
      usageQuotaReporting: unknownCapability(
        "Usage reports depend on Claude Code and provider response metadata."
      )
    },
    notes: [
      "External tool only; no Claude Code binary is bundled.",
      "Metadata describes the Claude Code adapter prototype, not the whole backend abstraction."
    ]
  };
}

export function supported(reason?: string): ClaudeCodeBridgeCapabilityStatus {
  return { state: "supported", reason };
}

export function candidate(reason: string): ClaudeCodeBridgeCapabilityStatus {
  return { state: "candidate", reason };
}

export function unsupported(reason: string): ClaudeCodeBridgeCapabilityStatus {
  return { state: "unsupported", reason };
}

export function unknown(reason: string): ClaudeCodeBridgeCapabilityStatus {
  return { state: "unknown", reason };
}
