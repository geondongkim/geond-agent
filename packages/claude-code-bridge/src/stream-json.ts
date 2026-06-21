import type {
  ApprovalDecision,
  ApprovalKind,
  CommandOutputStream,
  CommandStatus,
  ModelProfileCapability,
  PlanItemStatus,
  WorkbenchPlanItemSnapshot,
  WorkbenchDiffFileSnapshot,
  WorkbenchEvent,
  WorkbenchSelectionSnapshot,
  WorkbenchToolCallStatus
} from "@geond-agent/ui-workbench";
import {
  supportedCapability,
  unavailableCapability,
  unknownCapability
} from "@geond-agent/ui-workbench";
import {
  createZaiAnthropicRouteMetadata,
  createZaiOpenAiRouteMetadata,
  listZaiModelProfiles
} from "@geond-agent/zai-provider";

export interface ClaudeCodeSanitizedStreamRecord {
  readonly type?: unknown;
  readonly session_id?: unknown;
  readonly timestamp?: unknown;
  readonly message_id?: unknown;
  readonly text?: unknown;
  readonly delta?: unknown;
  readonly title?: unknown;
  readonly cwd?: unknown;
  readonly lifecycle?: unknown;
  readonly routing_mode?: unknown;
  readonly backend_id?: unknown;
  readonly provider_route_id?: unknown;
  readonly model_profile_id?: unknown;
  readonly ui_language?: unknown;
  readonly agent_language?: unknown;
  readonly items?: unknown;
  readonly tool_call_id?: unknown;
  readonly tool_name?: unknown;
  readonly input_summary?: unknown;
  readonly output_summary?: unknown;
  readonly status?: unknown;
  readonly command_id?: unknown;
  readonly stream?: unknown;
  readonly exit_code?: unknown;
  readonly diff_id?: unknown;
  readonly files?: unknown;
  readonly summary?: unknown;
  readonly approval_id?: unknown;
  readonly approval_kind?: unknown;
  readonly reason?: unknown;
  readonly subject?: unknown;
  readonly decision?: unknown;
  readonly id?: unknown;
  readonly message?: unknown;
}

export interface ClaudeCodeIgnoredStreamRecord {
  readonly index: number;
  readonly reason: string;
  readonly record: unknown;
}

export interface ClaudeCodeStreamJsonNormalizationOptions {
  readonly fallbackSessionId?: string;
}

export interface ClaudeCodeStreamJsonNormalizationResult {
  readonly events: readonly WorkbenchEvent[];
  readonly ignoredRecords: readonly ClaudeCodeIgnoredStreamRecord[];
}

export function normalizeClaudeCodeStreamJsonRecords(
  records: readonly unknown[],
  options: ClaudeCodeStreamJsonNormalizationOptions = {}
): ClaudeCodeStreamJsonNormalizationResult {
  const events: WorkbenchEvent[] = [];
  const ignoredRecords: ClaudeCodeIgnoredStreamRecord[] = [];

  records.forEach((record, index) => {
    const normalized = normalizeClaudeCodeStreamJsonRecord(record, options);
    if (normalized.length === 0) {
      const unsupportedRecordEvent = createUnsupportedRecordEvent(record, index, options);
      if (unsupportedRecordEvent) {
        events.push(unsupportedRecordEvent);
      }
      ignoredRecords.push({
        index,
        reason: "Unsupported or incomplete sanitized stream-json record.",
        record
      });
      return;
    }

    events.push(...normalized);
  });

  return { events, ignoredRecords };
}

export function normalizeClaudeCodeStreamJsonRecord(
  record: unknown,
  options: ClaudeCodeStreamJsonNormalizationOptions = {}
): readonly WorkbenchEvent[] {
  if (!isRecord(record)) {
    return [];
  }

  const type = asString(record.type);
  const sessionId = asString(record.session_id) ?? options.fallbackSessionId;
  const at = asString(record.timestamp);

  if (!type || !sessionId) {
    return [];
  }

  switch (type) {
    case "session.started":
      return [
        {
          type: "session.lifecycle",
          sessionId,
          lifecycle: normalizeLifecycle(record.lifecycle) ?? "started",
          title: asString(record.title),
          workspacePath: asString(record.cwd),
          selection: createSelectionSnapshot(record),
          at
        }
      ];
    case "session.completed": {
      const lifecycle = normalizeLifecycle(record.lifecycle) ?? normalizeCompletion(record.status);
      return lifecycle
        ? [
            {
              type: "session.lifecycle",
              sessionId,
              lifecycle,
              at
            }
          ]
        : [];
    }
    case "selection.snapshot": {
      const selection = createSelectionSnapshot(record);
      return selection
        ? [
            {
              type: "selection.snapshot.updated",
              sessionId,
              selection,
              at
            }
          ]
        : [];
    }
    case "assistant.message.delta": {
      const messageId = asString(record.message_id);
      const text = asString(record.delta) ?? asString(record.text);

      return messageId && text
        ? [
            {
              type: "assistant.text.delta",
              sessionId,
              messageId,
              text,
              at
            }
          ]
        : [];
    }
    case "assistant.message.completed": {
      const messageId = asString(record.message_id);

      return messageId
        ? [
            {
              type: "assistant.text.completed",
              sessionId,
              messageId,
              text: asString(record.text),
              at
            }
          ]
        : [];
    }
    case "plan.updated": {
      const items = normalizePlanItems(record.items);
      return items.length > 0
        ? [
            {
              type: "plan.updated",
              sessionId,
              items,
              at
            }
          ]
        : [];
    }
    case "tool.started": {
      const toolCallId = asString(record.tool_call_id);
      const name = asString(record.tool_name);

      return toolCallId && name
        ? [
            {
              type: "tool.call.started",
              sessionId,
              toolCall: {
                id: toolCallId,
                name,
                status: normalizeToolStatus(record.status) ?? "running",
                inputSummary: asString(record.input_summary)
              },
              at
            }
          ]
        : [];
    }
    case "tool.completed": {
      const toolCallId = asString(record.tool_call_id);
      return toolCallId
        ? [
            {
              type: "tool.call.updated",
              sessionId,
              toolCallId,
              status: normalizeToolStatus(record.status) ?? "succeeded",
              outputSummary: asString(record.output_summary),
              at
            }
          ]
        : [];
    }
    case "command.output": {
      const commandId = asString(record.command_id);
      const stream = normalizeCommandStream(record.stream);
      const text = asString(record.text);

      return commandId && stream && text !== undefined
        ? [
            {
              type: "command.output",
              sessionId,
              commandId,
              stream,
              text,
              status: normalizeCommandStatus(record.status),
              exitCode: asNumber(record.exit_code),
              at
            }
          ]
        : [];
    }
    case "diff.emitted": {
      const diffId = asString(record.diff_id);
      const files = normalizeDiffFiles(record.files);

      return diffId && files.length > 0
        ? [
            {
              type: "diff.emitted",
              sessionId,
              diff: {
                id: diffId,
                title: asString(record.title),
                files,
                summary: asString(record.summary)
              },
              at
            }
          ]
        : [];
    }
    case "approval.requested": {
      const approvalId = asString(record.approval_id);
      const kind = normalizeApprovalKind(record.approval_kind);
      const title = asString(record.title);

      return approvalId && kind && title
        ? [
            {
              type: "approval.requested",
              sessionId,
              approval: {
                id: approvalId,
                kind,
                title,
                reason: asString(record.reason),
                subject: asString(record.subject),
                status: "pending"
              },
              at
            }
          ]
        : [];
    }
    case "approval.resolved": {
      const approvalId = asString(record.approval_id);
      const decision = normalizeApprovalDecision(record.decision);

      return approvalId && decision
        ? [
            {
              type: "approval.resolved",
              sessionId,
              approvalId,
              decision,
              at
            }
          ]
        : [];
    }
    case "warning":
    case "error": {
      const id = asString(record.id);
      const message = asString(record.message);

      return id && message
        ? [
            {
              type,
              sessionId,
              id,
              message,
              at
            }
          ]
        : [];
    }
    default:
      return [];
  }
}

function createSelectionSnapshot(
  record: ClaudeCodeSanitizedStreamRecord
): WorkbenchSelectionSnapshot | undefined {
  const backendAdapterId = asString(record.backend_id) ?? "claude-code.external-cli-acp";
  const providerRouteId = asString(record.provider_route_id);
  const modelProfileId = asString(record.model_profile_id);
  const routingMode = normalizeRoutingMode(record.routing_mode) ?? "manual";

  if (!backendAdapterId) {
    return undefined;
  }

  const providerRoute = createKnownProviderRoute(providerRouteId);
  const modelProfile = createKnownModelProfile(modelProfileId, providerRouteId);
  const capabilityWarnings: string[] = [];

  if (providerRoute?.apiKeyState === "missing") {
    capabilityWarnings.push(
      `${providerRoute.label} key presence is missing in this sanitized fixture.`
    );
  }

  if (modelProfileId && !modelProfile) {
    capabilityWarnings.push(`Unknown model alias or profile id: ${modelProfileId}`);
  }

  return {
    backendAdapterId,
    providerRouteId,
    modelProfileId,
    routingMode,
    backendAdapter: createKnownBackendAdapter(backendAdapterId),
    providerRoute,
    modelProfile,
    uiLanguage: normalizeLanguage(record.ui_language),
    agentResponseLanguage: asString(record.agent_language),
    capabilityWarnings: capabilityWarnings.length > 0 ? capabilityWarnings : undefined
  };
}

function normalizePlanItems(value: unknown): readonly WorkbenchPlanItemSnapshot[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    if (!isRecord(item)) {
      return [];
    }

    const id = asString(item.id);
    const title = asString(item.title);
    const status = normalizePlanStatus(item.status);

    return id && title && status ? [{ id, title, status }] : [];
  });
}

function normalizeDiffFiles(value: unknown): readonly WorkbenchDiffFileSnapshot[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((file) => {
    if (!isRecord(file)) {
      return [];
    }

    const path = asString(file.path);
    const changeKind = normalizeDiffChangeKind(file.change_kind);
    if (!path || !changeKind) {
      return [];
    }

    return [
      {
        path,
        changeKind,
        additions: asNumber(file.additions),
        deletions: asNumber(file.deletions)
      }
    ];
  });
}

function normalizePlanStatus(value: unknown): PlanItemStatus | undefined {
  switch (value) {
    case "pending":
    case "in_progress":
    case "completed":
    case "failed":
      return value;
    default:
      return undefined;
  }
}

function normalizeToolStatus(value: unknown): WorkbenchToolCallStatus | undefined {
  switch (value) {
    case "pending":
    case "running":
    case "succeeded":
    case "failed":
      return value;
    default:
      return undefined;
  }
}

function normalizeCommandStatus(value: unknown): CommandStatus | undefined {
  switch (value) {
    case "running":
    case "succeeded":
    case "failed":
    case "interrupted":
      return value;
    default:
      return undefined;
  }
}

function normalizeCommandStream(value: unknown): CommandOutputStream | undefined {
  switch (value) {
    case "stdout":
    case "stderr":
    case "status":
      return value;
    default:
      return undefined;
  }
}

function normalizeApprovalKind(value: unknown): ApprovalKind | undefined {
  switch (value) {
    case "command":
    case "diff":
    case "filesystem":
    case "network":
    case "mcp":
      return value;
    default:
      return undefined;
  }
}

function normalizeApprovalDecision(value: unknown): ApprovalDecision | undefined {
  switch (value) {
    case "approved":
    case "rejected":
    case "cancelled":
      return value;
    default:
      return undefined;
  }
}

function normalizeLifecycle(
  value: unknown
): Extract<WorkbenchEvent, { type: "session.lifecycle" }>["lifecycle"] | undefined {
  switch (value) {
    case "created":
    case "started":
    case "resumed":
    case "paused":
    case "completed":
    case "failed":
      return value;
    default:
      return undefined;
  }
}

function normalizeCompletion(
  value: unknown
): Extract<WorkbenchEvent, { type: "session.lifecycle" }>["lifecycle"] | undefined {
  switch (value) {
    case "succeeded":
      return "completed";
    case "failed":
      return "failed";
    default:
      return undefined;
  }
}

function normalizeRoutingMode(value: unknown): WorkbenchSelectionSnapshot["routingMode"] | undefined {
  switch (value) {
    case "manual":
    case "auto":
      return value;
    default:
      return undefined;
  }
}

function normalizeLanguage(value: unknown): WorkbenchSelectionSnapshot["uiLanguage"] | undefined {
  switch (value) {
    case "en":
    case "ko":
      return value;
    default:
      return undefined;
  }
}

function normalizeDiffChangeKind(value: unknown): WorkbenchDiffFileSnapshot["changeKind"] | undefined {
  switch (value) {
    case "added":
    case "modified":
    case "deleted":
    case "renamed":
      return value;
    default:
      return undefined;
  }
}

function createUnsupportedRecordEvent(
  record: unknown,
  index: number,
  options: ClaudeCodeStreamJsonNormalizationOptions
): WorkbenchEvent | undefined {
  if (!isRecord(record)) {
    return undefined;
  }

  const sessionId = asString(record.session_id) ?? options.fallbackSessionId;
  const type = asString(record.type);

  if (!sessionId || !type) {
    return undefined;
  }

  return {
    type: "warning",
    sessionId,
    id: `sanitized-stream-json-${index}`,
    message: `Sanitized Claude stream-json record of type "${type}" is not mapped yet.`,
    at: asString(record.timestamp)
  };
}

function createKnownBackendAdapter(
  backendAdapterId: string
): WorkbenchSelectionSnapshot["backendAdapter"] {
  if (backendAdapterId !== "claude-code.external-cli-acp") {
    return {
      id: backendAdapterId,
      label: backendAdapterId,
      kind: "external-cli",
      capabilities: {
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
      }
    };
  }

  return {
    id: "claude-code.external-cli-acp",
    label: "Claude Code external CLI/ACP candidate",
    kind: "claude-code",
    capabilities: {
      sessions: supportedCapability(),
      resume: unknownCapability("Resume needs installed-tool validation."),
      fork: unknownCapability("Fork behavior is still deferred."),
      toolCalls: supportedCapability(),
      terminalOutput: supportedCapability(),
      diffEvents: supportedCapability(),
      approvals: supportedCapability(),
      modelRouting: supportedCapability(),
      modelPicker: unavailableCapability("The first slice shows metadata only."),
      autoRouting: unavailableCapability("Auto routing is deferred until provider validation."),
      usageQuotaReporting: unknownCapability("Depends on Claude Code and provider metadata.")
    },
    notes: ["External tool only; no Claude Code binary is bundled."]
  };
}

function createKnownProviderRoute(
  providerRouteId: string | undefined
): WorkbenchSelectionSnapshot["providerRoute"] {
  switch (providerRouteId) {
    case "zai.anthropic-compatible": {
      const route = createZaiAnthropicRouteMetadata();
      return {
        id: route.id,
        providerId: route.providerId,
        label: route.label,
        kind: "anthropic-compatible",
        endpoint: route.endpoint,
        hasApiKey: route.hasApiKey,
        apiKeyState: route.apiKeyState
      };
    }
    case "zai.openai-compatible-coding": {
      const route = createZaiOpenAiRouteMetadata();
      return {
        id: route.id,
        providerId: route.providerId,
        label: route.label,
        kind: "openai-compatible",
        endpoint: route.endpoint,
        hasApiKey: route.hasApiKey,
        apiKeyState: route.apiKeyState
      };
    }
    case undefined:
      return undefined;
    default:
      return {
        id: providerRouteId,
        providerId: "unknown",
        label: providerRouteId,
        kind: "native-provider",
        hasApiKey: false,
        apiKeyState: "missing"
      };
  }
}

function createKnownModelProfile(
  modelProfileId: string | undefined,
  providerRouteId: string | undefined
): WorkbenchSelectionSnapshot["modelProfile"] {
  if (!modelProfileId) {
    return undefined;
  }

  const routeId = providerRouteId ?? "zai.anthropic-compatible";
  const profile = listZaiModelProfiles().find(
    (candidate) => candidate.id === modelProfileId || candidate.routeAliases.includes(modelProfileId)
  );

  if (!profile) {
    return undefined;
  }

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

  return {
    id: modelProfileId,
    label:
      profile.id === modelProfileId
        ? profile.label
        : `${modelProfileId} alias -> ${profile.label}`,
    providerRouteId: routeId,
    aliases: profile.routeAliases,
    capabilities,
    availability: unknownCapability("Availability depends on the installed tool and local provider key."),
    notes:
      profile.id === modelProfileId
        ? profile.notes
        : [`Fixture used alias "${modelProfileId}" which maps to ${profile.id}.`, ...(profile.notes ?? [])]
  };
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function asNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
