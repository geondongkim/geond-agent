import type { WorkbenchEvent } from "./events.js";
import { replayWorkbenchEvents, type WorkbenchStateSnapshot } from "./replay.js";
import {
  supportedCapability,
  unavailableCapability,
  unknownCapability,
  type WorkbenchSelectionSnapshot
} from "./selection.js";

export const ZAI_PRE_SUBSCRIPTION_SELECTION: WorkbenchSelectionSnapshot = {
  backendAdapterId: "claude-code.external-cli-acp",
  providerRouteId: "zai.anthropic-compatible",
  modelProfileId: "zai.glm-4.7",
  routingMode: "manual",
  uiLanguage: "ko",
  agentResponseLanguage: "system",
  backendAdapter: {
    id: "claude-code.external-cli-acp",
    label: "Claude Code external CLI/ACP candidate",
    kind: "claude-code",
    capabilities: {
      sessions: supportedCapability(),
      resume: unknownCapability("Resume needs paid evaluation against the installed tool."),
      fork: unknownCapability("Fork behavior needs ACP/CLI evaluation."),
      toolCalls: supportedCapability(),
      terminalOutput: supportedCapability(),
      diffEvents: supportedCapability(),
      approvals: supportedCapability(),
      modelRouting: supportedCapability(),
      modelPicker: unavailableCapability("The first slice exposes metadata only."),
      autoRouting: unavailableCapability("Auto routing is deferred until provider catalog validation."),
      usageQuotaReporting: unknownCapability("Depends on adapter/provider reporting.")
    },
    notes: ["External tool only; no Claude Code binary is bundled."]
  },
  providerRoute: {
    id: "zai.anthropic-compatible",
    providerId: "zai",
    label: "Z.ai Anthropic-compatible route",
    kind: "anthropic-compatible",
    endpoint: "https://api.z.ai/api/anthropic",
    hasApiKey: false,
    apiKeyState: "missing",
    notes: ["Pre-subscription fixture uses key presence only and never stores the key value."]
  },
  modelProfile: {
    id: "zai.glm-4.7",
    label: "GLM 4.7",
    providerRouteId: "zai.anthropic-compatible",
    aliases: ["haiku", "sonnet", "ordinary"],
    capabilities: ["coding", "tool-calling", "streaming", "thinking"],
    availability: unknownCapability("Availability must be checked after subscription.")
  },
  capabilityWarnings: ["Z.ai API key missing until paid evaluation starts."]
};

export const ZAI_PRE_SUBSCRIPTION_SAMPLE_EVENTS: readonly WorkbenchEvent[] = [
  {
    type: "session.lifecycle",
    sessionId: "eval-task-1",
    lifecycle: "started",
    title: "Task 1: Invalid UI language persistence",
    workspacePath: "/workspace/geond-agent",
    selection: ZAI_PRE_SUBSCRIPTION_SELECTION,
    at: "2026-06-21T00:00:00.000Z"
  },
  {
    type: "assistant.text.delta",
    sessionId: "eval-task-1",
    messageId: "assistant-1",
    text: "I will inspect the language settings boundary first.",
    at: "2026-06-21T00:00:01.000Z"
  },
  {
    type: "assistant.text.completed",
    sessionId: "eval-task-1",
    messageId: "assistant-1",
    at: "2026-06-21T00:00:02.000Z"
  },
  {
    type: "plan.updated",
    sessionId: "eval-task-1",
    items: [
      { id: "read", title: "Read i18n and settings code", status: "completed" },
      { id: "patch", title: "Patch normalization behavior", status: "in_progress" },
      { id: "verify", title: "Run pnpm verify", status: "pending" }
    ],
    at: "2026-06-21T00:00:03.000Z"
  },
  {
    type: "tool.call.started",
    sessionId: "eval-task-1",
    toolCall: {
      id: "tool-1",
      name: "read-files",
      status: "running",
      inputSummary: "packages/ui-workbench/src/settings and src/i18n"
    },
    at: "2026-06-21T00:00:04.000Z"
  },
  {
    type: "tool.call.updated",
    sessionId: "eval-task-1",
    toolCallId: "tool-1",
    status: "succeeded",
    outputSummary: "Found language normalization boundary.",
    at: "2026-06-21T00:00:05.000Z"
  },
  {
    type: "command.output",
    sessionId: "eval-task-1",
    commandId: "cmd-verify",
    stream: "stdout",
    text: "pnpm verify",
    status: "running",
    at: "2026-06-21T00:00:06.000Z"
  },
  {
    type: "diff.emitted",
    sessionId: "eval-task-1",
    diff: {
      id: "diff-1",
      title: "Normalize corrupted language settings",
      files: [
        {
          path: "packages/ui-workbench/src/settings/language-settings.ts",
          changeKind: "modified",
          additions: 4,
          deletions: 1
        }
      ],
      summary: "Unsupported UI languages fall back to en without changing agent response language."
    },
    at: "2026-06-21T00:00:07.000Z"
  },
  {
    type: "approval.requested",
    sessionId: "eval-task-1",
    approval: {
      id: "approval-1",
      kind: "diff",
      title: "Review language settings patch",
      status: "pending",
      subject: "packages/ui-workbench/src/settings/language-settings.ts"
    },
    at: "2026-06-21T00:00:08.000Z"
  },
  {
    type: "approval.resolved",
    sessionId: "eval-task-1",
    approvalId: "approval-1",
    decision: "approved",
    at: "2026-06-21T00:00:09.000Z"
  },
  {
    type: "warning",
    sessionId: "eval-task-1",
    id: "warning-no-paid-key",
    message: "Z.ai provider key is missing because this is a pre-subscription fixture.",
    at: "2026-06-21T00:00:10.000Z"
  }
];

export function replayZaiPreSubscriptionSample(): WorkbenchStateSnapshot {
  return replayWorkbenchEvents(ZAI_PRE_SUBSCRIPTION_SAMPLE_EVENTS);
}

