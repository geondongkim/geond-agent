import type {
  CommandStatus,
  WorkbenchContextAttachmentContentState,
  WorkbenchContextAttachmentKind,
  WorkbenchContextAttachmentProvenance,
  WorkbenchContextAttachmentRange,
  WorkbenchDiffFileSnapshot,
  WorkbenchRunAttemptTrigger,
  WorkbenchRunAttemptStatus,
  WorkbenchRunnerIssueKind,
  WorkbenchToolCallStatus
} from "@geond-agent/ui-workbench";

import type {
  JsonValue,
  WorkbenchCommandOutputRecord,
  WorkbenchContextAttachmentRecord,
  WorkbenchDiffSummaryRecord,
  WorkbenchRunAttemptRecord,
  WorkbenchToolCallRecord,
  WorkbenchUsageMetadataRecord
} from "../persistence/materialized-event-store.js";
import type { ProjectedActiveSession } from "./workbench-types.js";

export interface MaterializedInspectorRecords {
  readonly sessionId: string;
  readonly contextAttachments: readonly WorkbenchContextAttachmentRecord[];
  readonly toolCalls: readonly WorkbenchToolCallRecord[];
  readonly commandOutputs: readonly WorkbenchCommandOutputRecord[];
  readonly diffSummaries: readonly WorkbenchDiffSummaryRecord[];
  readonly usageMetadata: readonly WorkbenchUsageMetadataRecord[];
  readonly runAttempts?: readonly WorkbenchRunAttemptRecord[];
}

export interface InspectorSessionReadModel {
  readonly sessionId: string;
  readonly source: "materialized" | "projection";
  readonly contextAttachments: ProjectedActiveSession["contextAttachments"];
  readonly toolCalls: ProjectedActiveSession["toolCalls"];
  readonly commandOutputs: ProjectedActiveSession["commandOutputs"];
  readonly diffs: ProjectedActiveSession["diffs"];
  readonly usageReports: ProjectedActiveSession["usageReports"];
  readonly runAttempts: ProjectedActiveSession["runAttempts"];
}

export function createProjectionInspectorSessionReadModel(
  activeSession: ProjectedActiveSession | undefined
): InspectorSessionReadModel | undefined {
  if (!activeSession) {
    return undefined;
  }

  return {
    sessionId: activeSession.id,
    source: "projection",
    contextAttachments: activeSession.contextAttachments,
    toolCalls: activeSession.toolCalls,
    commandOutputs: activeSession.commandOutputs,
    diffs: activeSession.diffs,
    usageReports: activeSession.usageReports,
    runAttempts: activeSession.runAttempts
  };
}

export function createInspectorEvidenceSignature(
  activeSession: ProjectedActiveSession | undefined
): string {
  if (!activeSession) {
    return "none";
  }

  return [
    `session:${activeSession.id}`,
    createListSignature(activeSession.contextAttachments, (attachment) =>
      [
        attachment.id,
        attachment.kind,
        attachment.title,
        attachment.contentState,
        attachment.path,
        attachment.attachedAt
      ].join(":")
    ),
    createListSignature(activeSession.toolCalls, (toolCall) =>
      [
        toolCall.id,
        toolCall.name,
        toolCall.status,
        createTextSignature(toolCall.inputSummary),
        createTextSignature(toolCall.outputSummary)
      ].join(":")
    ),
    createListSignature(activeSession.commandOutputs, (command) =>
      [
        command.id,
        command.status,
        command.exitCode ?? "none",
        command.chunkCount,
        createTextSignature(command.preview)
      ].join(":")
    ),
    createListSignature(activeSession.diffs, (diff) =>
      [
        diff.id,
        diff.title,
        diff.files.length,
        createTextSignature(diff.summary),
        diff.files
          .map((file) =>
            [file.path, file.changeKind, file.additions ?? 0, file.deletions ?? 0].join(":")
          )
          .join(",")
      ].join(":")
    ),
    createListSignature(activeSession.usageReports, (usage) =>
      [
        usage.id,
        usage.source,
        usage.model,
        usage.inputTokens ?? 0,
        usage.outputTokens ?? 0,
        usage.costUsd ?? 0
      ].join(":")
    ),
    createListSignature(activeSession.runAttempts, (attempt) =>
      [
        attempt.id,
        attempt.mode,
        attempt.status,
        attempt.externalSessionId,
        attempt.eventCount ?? 0,
        attempt.ignoredRecordCount ?? 0,
        attempt.parseWarningCount ?? 0,
        attempt.exitCode ?? "none",
        attempt.finishedAt,
        attempt.failureKind,
        attempt.trigger,
        attempt.sourceApprovalId,
        createTextSignature(attempt.errorMessage)
      ].join(":")
    ),
    createListSignature(activeSession.runnerIssues ?? [], (issue) =>
      [
        issue.id,
        issue.kind,
        issue.severity,
        issue.providerRouteId,
        issue.modelProfileId,
        issue.routeHealth,
        issue.suggestedAction,
        issue.retryable,
        issue.detectedAt,
        createTextSignature(issue.message)
      ].join(":")
    )
  ].join("|");
}

export function createMaterializedInspectorSessionReadModel(
  records: MaterializedInspectorRecords,
  fallback: ProjectedActiveSession | undefined
): InspectorSessionReadModel {
  const contextAttachments = records.contextAttachments.map((record) => ({
    id: record.attachmentId,
    kind: normalizeContextKind(record.kind),
    title: record.title,
    provenance: normalizeContextProvenance(record.provenance),
    contentState: normalizeContextContentState(record.contentState),
    path: record.path,
    language: record.language,
    range: normalizeContextRange(record.range),
    summary: record.summary,
    attachedAt: record.attachedAt
  }));
  const toolCalls = records.toolCalls.map((record) => ({
    id: record.toolCallId,
    name: record.name,
    status: normalizeToolCallStatus(record.status),
    inputSummary: record.inputSummary,
    outputSummary: record.outputSummary
  }));
  const commandOutputs = records.commandOutputs.map((record) => ({
    id: record.commandId,
    status: normalizeCommandStatus(record.status),
    exitCode: record.exitCode,
    preview: [record.stdoutPreview, record.stderrPreview]
      .filter((value): value is string => typeof value === "string" && value.length > 0)
      .join("\n"),
    chunkCount: record.chunkCount
  }));
  const diffs = records.diffSummaries.map((record) => ({
    id: record.diffId,
    title: record.title,
    files: normalizeDiffFiles(record.files),
    summary: record.summary
  }));
  const usageReports = records.usageMetadata.map((record) => ({
    id: record.usageId,
    source: normalizeUsageSource(record.source),
    model: record.model,
    inputTokens: record.inputTokens,
    outputTokens: record.outputTokens,
    cacheCreationInputTokens: record.cacheCreationInputTokens,
    cacheReadInputTokens: record.cacheReadInputTokens,
    contextWindow: record.contextWindow,
    maxOutputTokens: record.maxOutputTokens,
    costUsd: record.costUsd,
    serviceTier: record.serviceTier,
    note: record.note
  }));
  const runAttempts: ProjectedActiveSession["runAttempts"] = (records.runAttempts ?? []).map((record) => ({
    id: record.attemptId,
    mode: record.mode === "fixture" ? "fixture" as const : "claude-live" as const,
    status: normalizeRunAttemptStatus(record.status),
    backendAdapterId: record.backendAdapterId,
    providerRouteId: record.providerRouteId,
    modelProfileId: record.modelProfileId,
    routingMode: normalizeRoutingMode(record.routingMode),
    permissionMode: record.permissionMode,
    externalSessionId: record.externalSessionId,
    resumedFromExternalSessionId: record.resumedFromExternalSessionId,
    commandPreview: record.commandPreview,
    promptSummary: record.promptSummary,
    startedAt: record.startedAt,
    finishedAt: record.finishedAt,
    exitCode: record.exitCode,
    eventCount: record.eventCount,
    ignoredRecordCount: record.ignoredRecordCount,
    parseWarningCount: record.parseWarningCount,
    errorMessage: record.errorMessage,
    failureKind: normalizeRunnerIssueKind(record.failureKind),
    trigger: normalizeRunAttemptTrigger(record.trigger),
    sourceApprovalId: record.sourceApprovalId
  }));
  const hasMaterializedRows =
    contextAttachments.length +
      toolCalls.length +
      commandOutputs.length +
      diffs.length +
      usageReports.length +
      runAttempts.length >
    0;

  return {
    sessionId: records.sessionId,
    source: hasMaterializedRows ? "materialized" : "projection",
    contextAttachments:
      contextAttachments.length > 0 ? contextAttachments : fallback?.contextAttachments ?? [],
    toolCalls: toolCalls.length > 0 ? toolCalls : fallback?.toolCalls ?? [],
    commandOutputs:
      commandOutputs.length > 0 ? commandOutputs : fallback?.commandOutputs ?? [],
    diffs: diffs.length > 0 ? diffs : fallback?.diffs ?? [],
    usageReports: usageReports.length > 0 ? usageReports : fallback?.usageReports ?? [],
    runAttempts: runAttempts.length > 0 ? runAttempts : fallback?.runAttempts ?? []
  };
}

function createListSignature<T>(
  items: readonly T[],
  serialize: (item: T) => string
): string {
  return `${items.length}[${items.map(serialize).join(";")}]`;
}

function createTextSignature(value: string | undefined): string {
  if (!value) {
    return "0:0";
  }

  return `${value.length}:${fnv1a32(value)}`;
}

function fnv1a32(value: string): string {
  let hash = 0x811c9dc5;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }

  return (hash >>> 0).toString(16).padStart(8, "0");
}

function normalizeContextKind(value: string): WorkbenchContextAttachmentKind {
  return isOneOf(value, ["workspace", "file", "selection", "note"]) ? value : "note";
}

function normalizeContextProvenance(value: string): WorkbenchContextAttachmentProvenance {
  return isOneOf(value, ["desktop", "ide-plugin", "manual", "backend"]) ? value : "backend";
}

function normalizeContextContentState(value: string): WorkbenchContextAttachmentContentState {
  return isOneOf(value, ["metadata-only", "redacted", "external-reference"])
    ? value
    : "metadata-only";
}

function normalizeToolCallStatus(value: string): WorkbenchToolCallStatus {
  return isOneOf(value, ["pending", "running", "succeeded", "failed"]) ? value : "pending";
}

function normalizeCommandStatus(value: string): CommandStatus {
  return isOneOf(value, ["running", "succeeded", "failed", "interrupted"])
    ? value
    : "running";
}

function normalizeUsageSource(value: string): "backend" | "provider" | "model" {
  return isOneOf(value, ["backend", "provider", "model"]) ? value : "backend";
}

function normalizeRoutingMode(value: string | undefined): "manual" | "auto" | undefined {
  if (value === undefined) {
    return undefined;
  }

  return isOneOf(value, ["manual", "auto"]) ? value : undefined;
}

function normalizeRunAttemptStatus(value: string): WorkbenchRunAttemptStatus {
  return isOneOf(value, ["running", "succeeded", "failed", "cancelled"])
    ? value
    : "failed";
}

function normalizeRunAttemptTrigger(
  value: string | undefined
): WorkbenchRunAttemptTrigger | undefined {
  if (value === undefined) {
    return undefined;
  }

  return isOneOf(value, ["manual", "manual_resume", "approval_follow_up", "readiness_blocked"])
    ? value
    : undefined;
}

function normalizeRunnerIssueKind(
  value: string | undefined
): WorkbenchRunnerIssueKind | undefined {
  if (value === undefined) {
    return undefined;
  }

  return isOneOf(value, [
    "provider_overloaded",
    "provider_auth",
    "provider_quota",
    "provider_timeout",
    "readiness_blocked",
    "runner_process",
    "unknown"
  ])
    ? value
    : undefined;
}

function normalizeContextRange(
  value: JsonValue | undefined
): WorkbenchContextAttachmentRange | undefined {
  if (!isJsonObject(value)) {
    return undefined;
  }

  const startLine = readNumber(value, "startLine");
  if (startLine === undefined) {
    return undefined;
  }

  return {
    startLine,
    startColumn: readNumber(value, "startColumn"),
    endLine: readNumber(value, "endLine"),
    endColumn: readNumber(value, "endColumn")
  };
}

function normalizeDiffFiles(value: JsonValue): readonly WorkbenchDiffFileSnapshot[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((entry) => {
    if (!isJsonObject(entry)) {
      return [];
    }

    const path = readString(entry, "path");
    if (!path) {
      return [];
    }

    return [
      {
        path,
        changeKind: normalizeChangeKind(readString(entry, "changeKind")),
        additions: readNumber(entry, "additions"),
        deletions: readNumber(entry, "deletions")
      }
    ];
  });
}

function normalizeChangeKind(
  value: string | undefined
): WorkbenchDiffFileSnapshot["changeKind"] {
  return value && isOneOf(value, ["added", "modified", "deleted", "renamed"])
    ? value
    : "modified";
}

function isJsonObject(
  value: JsonValue | undefined
): value is { readonly [key: string]: JsonValue } {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function readString(
  value: { readonly [key: string]: JsonValue },
  key: string
): string | undefined {
  const next = value[key];
  return typeof next === "string" ? next : undefined;
}

function readNumber(
  value: { readonly [key: string]: JsonValue },
  key: string
): number | undefined {
  const next = value[key];
  return typeof next === "number" ? next : undefined;
}

function isOneOf<T extends string>(
  value: string,
  allowed: readonly T[]
): value is T {
  return (allowed as readonly string[]).includes(value);
}
