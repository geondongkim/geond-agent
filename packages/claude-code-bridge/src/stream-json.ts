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
  readonly source?: unknown;
  readonly usage?: unknown;
  readonly model?: unknown;
  readonly cost_usd?: unknown;
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
  readonly workbenchSessionId?: string;
  readonly adapterId?: string;
  readonly resumedFromExternalSessionId?: string;
}

export interface ClaudeCodeStreamJsonNormalizationResult {
  readonly events: readonly WorkbenchEvent[];
  readonly ignoredRecords: readonly ClaudeCodeIgnoredStreamRecord[];
}

export interface ClaudeCodeStreamJsonNormalizer {
  readonly accept: (record: unknown) => ClaudeCodeStreamJsonNormalizationResult;
  readonly acceptMany: (records: readonly unknown[]) => ClaudeCodeStreamJsonNormalizationResult;
}

interface ClaudeCodeStreamJsonNormalizerState {
  currentAssistantMessageId?: string;
  activeTextMessageId?: string;
}

export function normalizeClaudeCodeStreamJsonRecords(
  records: readonly unknown[],
  options: ClaudeCodeStreamJsonNormalizationOptions = {}
): ClaudeCodeStreamJsonNormalizationResult {
  return createClaudeCodeStreamJsonNormalizer(options).acceptMany(records);
}

export function createClaudeCodeStreamJsonNormalizer(
  options: ClaudeCodeStreamJsonNormalizationOptions = {}
): ClaudeCodeStreamJsonNormalizer {
  const events: WorkbenchEvent[] = [];
  const ignoredRecords: ClaudeCodeIgnoredStreamRecord[] = [];
  const state: ClaudeCodeStreamJsonNormalizerState = {};
  let nextIndex = 0;

  const acceptRecord = (record: unknown): void => {
    const index = nextIndex;
    nextIndex += 1;
    const normalized = normalizeClaudeCodeStreamJsonRecordWithState(record, options, state);
    if (normalized.length === 0) {
      if (isRecognizedIgnorableClaudeCodeRecord(record)) {
        return;
      }

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
  };

  return {
    accept: (record) => {
      const beforeEvents = events.length;
      const beforeIgnoredRecords = ignoredRecords.length;
      acceptRecord(record);
      return {
        events: events.slice(beforeEvents),
        ignoredRecords: ignoredRecords.slice(beforeIgnoredRecords)
      };
    },
    acceptMany: (records) => {
      const beforeEvents = events.length;
      const beforeIgnoredRecords = ignoredRecords.length;
      records.forEach(acceptRecord);
      return {
        events: events.slice(beforeEvents),
        ignoredRecords: ignoredRecords.slice(beforeIgnoredRecords)
      };
    }
  };
}

export function normalizeClaudeCodeStreamJsonRecord(
  record: unknown,
  options: ClaudeCodeStreamJsonNormalizationOptions = {}
): readonly WorkbenchEvent[] {
  return normalizeClaudeCodeStreamJsonRecordWithState(record, options, {});
}

function normalizeClaudeCodeStreamJsonRecordWithState(
  record: unknown,
  options: ClaudeCodeStreamJsonNormalizationOptions,
  state: ClaudeCodeStreamJsonNormalizerState
): readonly WorkbenchEvent[] {
  if (!isRecord(record)) {
    return [];
  }

  const type = asString(record.type);
  const externalSessionId = asString(record.session_id);
  const sessionId = options.workbenchSessionId ?? externalSessionId ?? options.fallbackSessionId;
  const at = asString(record.timestamp);

  if (!type || !sessionId) {
    return [];
  }

  switch (type) {
    case "system":
      return normalizeActualSystemRecord(record, sessionId, externalSessionId, at, options);
    case "assistant":
      return normalizeActualAssistantRecord(record, sessionId, at);
    case "user":
      return normalizeActualUserRecord(record, sessionId, at);
    case "result":
      return normalizeActualResultRecord(record, sessionId, at);
    case "stream_event":
      return normalizeActualStreamEventRecord(record, sessionId, at, state);
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
    case "usage.reported": {
      const usageEvent = createUsageEvent({
        sessionId,
        id: asString(record.id) ?? `sanitized-usage:${sessionId}`,
        source: normalizeUsageSource(record.source) ?? "provider",
        usage: record.usage ?? record,
        model: asString(record.model),
        costUsd: asNumber(record.cost_usd),
        at
      });
      return usageEvent ? [usageEvent] : [];
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

function normalizeActualSystemRecord(
  record: Record<string, unknown>,
  sessionId: string,
  externalSessionId: string | undefined,
  at: string | undefined,
  options: ClaudeCodeStreamJsonNormalizationOptions
): readonly WorkbenchEvent[] {
  const subtype = asString(record.subtype);
  if (subtype !== "init") {
    return [];
  }

  const model = asString(record.model);
  const cwd = asString(record.cwd);

  const adapterId = options.adapterId ?? "claude-code.external-cli-acp";
  const events: WorkbenchEvent[] = [
    {
      type: "session.lifecycle",
      sessionId,
      lifecycle: options.resumedFromExternalSessionId ? "resumed" : "started",
      title: "Claude Code stream-json session",
      workspacePath: cwd,
      selection: createSelectionSnapshot({
        type: "selection.snapshot",
        session_id: sessionId,
        cwd,
        backend_id: adapterId,
        provider_route_id: "zai.anthropic-compatible",
        model_profile_id: model,
        routing_mode: "manual"
      }),
      at
    }
  ];

  if (externalSessionId) {
    events.push({
      type: "session.adapter.linked",
      sessionId,
      adapterId,
      externalSessionId,
      resumedFromExternalSessionId: options.resumedFromExternalSessionId,
      at
    });
  }

  return events;
}

function normalizeActualAssistantRecord(
  record: Record<string, unknown>,
  sessionId: string,
  at: string | undefined
): readonly WorkbenchEvent[] {
  const message = asRecord(record.message);
  const messageId = asString(message?.id) ?? asString(record.message_id);
  const content = asArray(message?.content);

  if (!messageId || !content) {
    return [];
  }

  const events: WorkbenchEvent[] = [];

  content.forEach((block) => {
    const contentBlock = asRecord(block);
    if (!contentBlock) {
      return;
    }

    const blockType = asString(contentBlock.type);
    switch (blockType) {
      case "text": {
        const text = asString(contentBlock.text);
        if (text) {
          events.push({
            type: "assistant.text.completed",
            sessionId,
            messageId,
            text,
            at
          });
        }
        return;
      }
      case "tool_use": {
        const toolCallId = asString(contentBlock.id);
        const toolName = asString(contentBlock.name);
        if (toolCallId && toolName) {
          events.push({
            type: "tool.call.started",
            sessionId,
            toolCall: {
              id: toolCallId,
              name: toolName,
              status: "running",
              inputSummary: summarizeUnknownValue(contentBlock.input)
            },
            at
          });
        }
        return;
      }
      default:
        return;
    }
  });

  return events;
}

function normalizeActualUserRecord(
  record: Record<string, unknown>,
  sessionId: string,
  at: string | undefined
): readonly WorkbenchEvent[] {
  const message = asRecord(record.message);
  const content = asArray(message?.content);

  if (!content) {
    return [];
  }

  return content.flatMap((block) => {
    const contentBlock = asRecord(block);
    if (!contentBlock || asString(contentBlock.type) !== "tool_result") {
      return [];
    }

    const toolCallId = asString(contentBlock.tool_use_id);
    if (!toolCallId) {
      return [];
    }

    return [
      {
        type: "tool.call.updated",
        sessionId,
        toolCallId,
        status: asBoolean(contentBlock.is_error) ? "failed" : "succeeded",
        outputSummary:
          summarizeUnknownValue(contentBlock.content) ??
          summarizeUnknownValue(record.tool_use_result),
        at
      }
    ];
  });
}

function normalizeActualResultRecord(
  record: Record<string, unknown>,
  sessionId: string,
  at: string | undefined
): readonly WorkbenchEvent[] {
  const events: WorkbenchEvent[] = [];
  const failed = asBoolean(record.is_error) === true || asString(record.subtype) === "error";
  const stopReason = asString(record.stop_reason);
  const durationMs = asNumber(record.duration_ms);
  const model = inferModelFromResult(record);
  const usageEvent = createUsageEvent({
    sessionId,
    id: `claude-code-result:${sessionId}`,
    source: "provider",
    usage: record.usage,
    model,
    costUsd: asNumber(record.total_cost_usd),
    at
  });

  if (usageEvent) {
    events.push(usageEvent);
  }

  events.push({
    type: "command.output",
    sessionId,
    commandId: "claude-code-result",
    stream: failed ? "stderr" : "status",
    text: [
      failed ? "Claude Code run failed." : "Claude Code run completed.",
      stopReason ? `stop reason: ${stopReason}` : undefined,
      durationMs === undefined ? undefined : `duration: ${durationMs}ms`
    ]
      .filter((line): line is string => line !== undefined)
      .join("\n"),
    status: failed ? "failed" : "succeeded",
    at
  });

  events.push({
    type: "session.lifecycle",
    sessionId,
    lifecycle: failed ? "failed" : "completed",
    at
  });

  return events;
}

function normalizeActualStreamEventRecord(
  record: Record<string, unknown>,
  sessionId: string,
  at: string | undefined,
  state: ClaudeCodeStreamJsonNormalizerState
): readonly WorkbenchEvent[] {
  const event = asRecord(record.event);
  const eventType = asString(event?.type);

  switch (eventType) {
    case "message_start": {
      const message = asRecord(event?.message);
      state.currentAssistantMessageId = asString(message?.id) ?? state.currentAssistantMessageId;
      return [];
    }
    case "content_block_start": {
      const contentBlock = asRecord(event?.content_block);
      if (asString(contentBlock?.type) === "text") {
        state.activeTextMessageId = state.currentAssistantMessageId;
      }
      return [];
    }
    case "content_block_delta": {
      const delta = asRecord(event?.delta);
      const text = asString(delta?.text) ?? asString(delta?.text_delta);
      const messageId = state.activeTextMessageId ?? state.currentAssistantMessageId;

      return text && messageId
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
    case "content_block_stop":
      state.activeTextMessageId = undefined;
      return [];
    case "message_delta": {
      const usageEvent = createUsageEvent({
        sessionId,
        id: `claude-code-stream:${sessionId}:${asString(record.uuid) ?? "message-delta"}`,
        source: "backend",
        usage: event?.usage,
        at
      });
      return usageEvent ? [usageEvent] : [];
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
      `${providerRoute.label} key presence is not stored in workbench events.`
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

function normalizeUsageSource(value: unknown): "backend" | "provider" | "model" | undefined {
  switch (value) {
    case "backend":
    case "provider":
    case "model":
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

function createUsageEvent(input: {
  readonly sessionId: string;
  readonly id: string;
  readonly source: "backend" | "provider" | "model";
  readonly usage: unknown;
  readonly model?: string;
  readonly costUsd?: number;
  readonly at?: string;
}): WorkbenchEvent | undefined {
  const usage = asRecord(input.usage);
  if (!usage) {
    return undefined;
  }

  const event: WorkbenchEvent = {
    type: "usage.reported",
    sessionId: input.sessionId,
    usage: {
      id: input.id,
      source: input.source,
      model: input.model,
      inputTokens: asNumber(usage.input_tokens),
      outputTokens: asNumber(usage.output_tokens),
      cacheCreationInputTokens: asNumber(usage.cache_creation_input_tokens),
      cacheReadInputTokens: asNumber(usage.cache_read_input_tokens),
      contextWindow: asNumber(usage.context_window),
      maxOutputTokens: asNumber(usage.max_output_tokens),
      costUsd: input.costUsd,
      serviceTier: asString(usage.service_tier)
    },
    at: input.at
  };

  const hasUsefulValue =
    event.usage.inputTokens !== undefined ||
    event.usage.outputTokens !== undefined ||
    event.usage.cacheCreationInputTokens !== undefined ||
    event.usage.cacheReadInputTokens !== undefined ||
    event.usage.contextWindow !== undefined ||
    event.usage.maxOutputTokens !== undefined ||
    event.usage.costUsd !== undefined ||
    event.usage.serviceTier !== undefined;

  return hasUsefulValue ? event : undefined;
}

function inferModelFromResult(record: Record<string, unknown>): string | undefined {
  const model = asString(record.model);
  if (model) {
    return model;
  }

  const modelUsage = asRecord(record.modelUsage);
  if (!modelUsage) {
    return undefined;
  }

  const models = Object.keys(modelUsage);
  return models.length === 1 ? models[0] : models.length > 1 ? models.join(", ") : undefined;
}

function isRecognizedIgnorableClaudeCodeRecord(record: unknown): boolean {
  if (!isRecord(record)) {
    return false;
  }

  const type = asString(record.type);
  switch (type) {
    case "system":
      return ["status", "thinking_tokens"].includes(asString(record.subtype) ?? "");
    case "stream_event": {
      const event = asRecord(record.event);
      const eventType = asString(event?.type);
      if (eventType === "message_delta") {
        return !asRecord(event?.usage);
      }
      return [
        "message_start",
        "content_block_start",
        "content_block_delta",
        "content_block_stop",
        "message_stop"
      ].includes(eventType ?? "");
    }
    case "assistant": {
      const message = asRecord(record.message);
      const content = asArray(message?.content);
      return content?.every((block) => asString(asRecord(block)?.type) === "thinking") ?? false;
    }
    default:
      return false;
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
    message: `Claude stream-json record of type "${type}" is not mapped yet.`,
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

function asBoolean(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return isRecord(value) ? value : undefined;
}

function asArray(value: unknown): readonly unknown[] | undefined {
  return Array.isArray(value) ? value : undefined;
}

function summarizeUnknownValue(value: unknown): string | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value === "string") {
    return previewText(value);
  }

  try {
    return previewText(JSON.stringify(value));
  } catch {
    return undefined;
  }
}

function previewText(value: string): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.length > 240 ? `${normalized.slice(0, 240)}...` : normalized;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
