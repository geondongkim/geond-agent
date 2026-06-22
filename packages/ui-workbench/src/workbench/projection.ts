import type {
  ApprovalDecision,
  CommandStatus,
  WorkbenchEvent,
  WorkbenchSessionLifecycle
} from "./events.js";
import {
  createEmptyWorkbenchState,
  replayWorkbenchEvents,
  type CommandOutputSnapshot,
  type WorkbenchSessionSnapshot,
  type WorkbenchStateSnapshot
} from "./replay.js";
import type { WorkbenchSelectionSnapshot } from "./selection.js";
import {
  listWorkbenchSessionIndexEntries,
  type WorkbenchSessionIndexEntry,
  type WorkbenchSessionIndexSnapshot
} from "./session-index.js";

export type WorkbenchTimelineEntryKind =
  | "session"
  | "adapter"
  | "selection"
  | "context"
  | "assistant"
  | "plan"
  | "tool"
  | "command"
  | "diff"
  | "usage"
  | "approval"
  | "warning"
  | "error";

export interface WorkbenchTimelineEntry {
  readonly id: string;
  readonly kind: WorkbenchTimelineEntryKind;
  readonly at?: string;
  readonly title: string;
  readonly body?: string;
  readonly status?: string;
}

export interface ProjectedSessionListItem {
  readonly id: string;
  readonly title: string;
  readonly lifecycle: WorkbenchSessionLifecycle;
  readonly workspacePath?: string;
  readonly backendLabel?: string;
  readonly updatedAt?: string;
  readonly resumable: boolean;
  readonly pendingApprovalCount: number;
  readonly warningCount: number;
  readonly errorCount: number;
}

export interface ProjectedWorkspaceSummary {
  readonly path: string;
  readonly label: string;
  readonly sessionCount: number;
  readonly updatedAt?: string;
}

export type ProjectedBackendStatusLevel = "ready" | "attention" | "unknown";

export interface ProjectedBackendStatus {
  readonly backendAdapterId: string;
  readonly label: string;
  readonly level: ProjectedBackendStatusLevel;
  readonly detail: string;
  readonly relatedSessionId: string;
}

export interface ProjectedCommandOutput {
  readonly id: string;
  readonly status: CommandStatus;
  readonly exitCode?: number;
  readonly preview: string;
  readonly chunkCount: number;
}

export interface ProjectedWorkbenchSession {
  readonly id: string;
  readonly title: string;
  readonly lifecycle: WorkbenchSessionLifecycle;
  readonly workspacePath?: string;
  readonly selection?: WorkbenchSelectionSnapshot;
  readonly externalSessions: WorkbenchSessionSnapshot["externalSessions"];
  readonly contextAttachments: readonly WorkbenchSessionSnapshot["contextAttachments"][string][];
  readonly assistantMessages: readonly WorkbenchSessionSnapshot["assistantMessages"][string][];
  readonly plan: WorkbenchSessionSnapshot["plan"];
  readonly toolCalls: readonly WorkbenchSessionSnapshot["toolCalls"][string][];
  readonly commandOutputs: readonly ProjectedCommandOutput[];
  readonly diffs: readonly WorkbenchSessionSnapshot["diffs"][string][];
  readonly usageReports: readonly WorkbenchSessionSnapshot["usageReports"][string][];
  readonly approvals: readonly WorkbenchSessionSnapshot["approvals"][string][];
  readonly notices: WorkbenchSessionSnapshot["notices"];
  readonly timeline: readonly WorkbenchTimelineEntry[];
}

export interface WorkbenchProjection {
  readonly activeSessionId?: string;
  readonly sessions: readonly ProjectedSessionListItem[];
  readonly pinnedSessions: readonly ProjectedSessionListItem[];
  readonly recentSessions: readonly ProjectedSessionListItem[];
  readonly workspaces: readonly ProjectedWorkspaceSummary[];
  readonly backendStatuses: readonly ProjectedBackendStatus[];
  readonly activeSession?: ProjectedWorkbenchSession;
}

export interface WorkbenchProjectionOptions {
  readonly pinnedSessionIds?: readonly string[];
  readonly activeSessionId?: string;
}

export function projectWorkbenchEvents(
  events: readonly WorkbenchEvent[],
  initialState: WorkbenchStateSnapshot = createEmptyWorkbenchState(),
  options: WorkbenchProjectionOptions = {}
): WorkbenchProjection {
  const state = replayWorkbenchEvents(events, initialState);
  return projectWorkbenchState(state, events, options);
}

export function projectWorkbenchSessionIndex(
  index: WorkbenchSessionIndexSnapshot,
  loadedEvents: readonly WorkbenchEvent[] = [],
  options: WorkbenchProjectionOptions = {}
): WorkbenchProjection {
  const sessionIndexEntries = listWorkbenchSessionIndexEntries(index);
  const sessions = sessionIndexEntries.map(projectSessionIndexEntry);
  const pinnedSessionIds = new Set(options.pinnedSessionIds ?? []);
  const activeSessionId =
    options.activeSessionId && index.sessions[options.activeSessionId]
      ? options.activeSessionId
      : sessions[0]?.id;
  const activeSessionEvents = activeSessionId
    ? loadedEvents.filter((event) => event.sessionId === activeSessionId)
    : [];
  const activeSessionState =
    activeSessionId && activeSessionEvents.length > 0
      ? replayWorkbenchEvents(activeSessionEvents).sessions[activeSessionId]
      : undefined;

  return {
    activeSessionId,
    sessions,
    pinnedSessions: sessions.filter((session) => pinnedSessionIds.has(session.id)),
    recentSessions: sessions.filter((session) => !pinnedSessionIds.has(session.id)),
    workspaces: projectWorkspaceSummariesFromIndex(sessionIndexEntries),
    backendStatuses: projectBackendStatusesFromIndex(sessionIndexEntries),
    activeSession: activeSessionState
      ? projectActiveSession(activeSessionState, activeSessionEvents)
      : undefined
  };
}

export function projectWorkbenchState(
  state: WorkbenchStateSnapshot,
  events: readonly WorkbenchEvent[] = [],
  options: WorkbenchProjectionOptions = {}
): WorkbenchProjection {
  const sessions = Object.values(state.sessions)
    .map(projectSessionListItem)
    .sort(compareSessionsByRecency);
  const pinnedSessionIds = new Set(options.pinnedSessionIds ?? []);
  const activeSessionId =
    options.activeSessionId && state.sessions[options.activeSessionId]
      ? options.activeSessionId
      : state.activeSessionId ?? sessions[0]?.id;
  const activeSessionState = activeSessionId ? state.sessions[activeSessionId] : undefined;

  return {
    activeSessionId,
    sessions,
    pinnedSessions: sessions.filter((session) => pinnedSessionIds.has(session.id)),
    recentSessions: sessions.filter((session) => !pinnedSessionIds.has(session.id)),
    workspaces: projectWorkspaceSummaries(Object.values(state.sessions)),
    backendStatuses: projectBackendStatuses(Object.values(state.sessions)),
    activeSession: activeSessionState
      ? projectActiveSession(activeSessionState, events.filter((event) => event.sessionId === activeSessionId))
      : undefined
  };
}

function projectSessionListItem(session: WorkbenchSessionSnapshot): ProjectedSessionListItem {
  return {
    id: session.id,
    title: session.title ?? session.id,
    lifecycle: session.lifecycle,
    workspacePath: session.workspacePath,
    backendLabel: session.selection?.backendAdapter?.label,
    updatedAt: session.updatedAt,
    resumable: isSessionResumable(session),
    pendingApprovalCount: session.pendingApprovalIds.length,
    warningCount: session.notices.filter((notice) => notice.level === "warning").length,
    errorCount: session.notices.filter((notice) => notice.level === "error").length
  };
}

function projectSessionIndexEntry(
  entry: WorkbenchSessionIndexEntry
): ProjectedSessionListItem {
  return {
    id: entry.id,
    title: entry.title ?? entry.id,
    lifecycle: entry.lifecycle,
    workspacePath: entry.workspacePath,
    backendLabel: entry.backendLabel,
    updatedAt: entry.updatedAt,
    resumable: entry.resumable,
    pendingApprovalCount: entry.pendingApprovalCount,
    warningCount: entry.warningCount,
    errorCount: entry.errorCount
  };
}

function compareSessionsByRecency(
  left: ProjectedSessionListItem,
  right: ProjectedSessionListItem
): number {
  const leftStamp = left.updatedAt ?? "";
  const rightStamp = right.updatedAt ?? "";
  return rightStamp.localeCompare(leftStamp) || left.title.localeCompare(right.title) || left.id.localeCompare(right.id);
}

function isSessionResumable(session: WorkbenchSessionSnapshot): boolean {
  return (
    Object.keys(session.externalSessions).length > 0 &&
    (session.lifecycle === "completed" ||
      session.lifecycle === "failed" ||
      session.lifecycle === "paused")
  );
}

function projectActiveSession(
  session: WorkbenchSessionSnapshot,
  events: readonly WorkbenchEvent[]
): ProjectedWorkbenchSession {
  return {
    id: session.id,
    title: session.title ?? session.id,
    lifecycle: session.lifecycle,
    workspacePath: session.workspacePath,
    selection: session.selection,
    externalSessions: session.externalSessions,
    contextAttachments: Object.values(session.contextAttachments),
    assistantMessages: Object.values(session.assistantMessages),
    plan: session.plan,
    toolCalls: Object.values(session.toolCalls),
    commandOutputs: Object.values(session.commandOutputs).map(projectCommandOutput),
    diffs: Object.values(session.diffs),
    usageReports: Object.values(session.usageReports),
    approvals: Object.values(session.approvals),
    notices: session.notices,
    timeline: events.map(projectTimelineEntry).filter((entry): entry is WorkbenchTimelineEntry => entry !== undefined)
  };
}

function projectCommandOutput(command: CommandOutputSnapshot): ProjectedCommandOutput {
  const preview = command.chunks
    .map((chunk) => chunk.text.trim())
    .filter((text) => text.length > 0)
    .slice(-3)
    .join("\n");

  return {
    id: command.id,
    status: command.status,
    exitCode: command.exitCode,
    preview,
    chunkCount: command.chunks.length
  };
}

function projectTimelineEntry(event: WorkbenchEvent): WorkbenchTimelineEntry | undefined {
  switch (event.type) {
    case "session.lifecycle":
      return {
        id: `${event.type}:${event.sessionId}:${event.lifecycle}:${event.at ?? "unknown"}`,
        kind: "session",
        at: event.at,
        title: describeSessionLifecycle(event.lifecycle),
        body: event.title ?? event.workspacePath,
        status: event.lifecycle
      };
    case "selection.snapshot.updated":
      return {
        id: `${event.type}:${event.sessionId}:${event.at ?? "unknown"}`,
        kind: "selection",
        at: event.at,
        title: "Selection snapshot updated",
        body: [event.selection.backendAdapterId, event.selection.providerRouteId, event.selection.modelProfileId]
          .filter(Boolean)
          .join(" / "),
        status: event.selection.routingMode
      };
    case "session.adapter.linked":
      return {
        id: [
          event.type,
          event.sessionId,
          event.adapterId,
          event.externalSessionId,
          event.at ?? "unknown"
        ].join(":"),
        kind: "adapter",
        at: event.at,
        title: "Adapter session linked",
        body: `${event.adapterId} / ${event.externalSessionId}`,
        status: event.resumedFromExternalSessionId ? "resumed" : "linked"
      };
    case "context.attached":
      return {
        id: `${event.type}:${event.attachment.id}:${event.at ?? "unknown"}`,
        kind: "context",
        at: event.at,
        title: event.attachment.title,
        body: describeContextAttachment(event.attachment),
        status: event.attachment.kind
      };
    case "assistant.text.delta":
      return {
        id: `${event.type}:${event.messageId}:${event.at ?? "unknown"}`,
        kind: "assistant",
        at: event.at,
        title: "Assistant update",
        body: event.text,
        status: "streaming"
      };
    case "assistant.text.completed":
      return event.text
        ? {
            id: `${event.type}:${event.messageId}:${event.at ?? "unknown"}`,
            kind: "assistant",
            at: event.at,
            title: "Assistant message completed",
            body: event.text,
            status: "completed"
          }
        : undefined;
    case "plan.updated":
      return {
        id: `${event.type}:${event.sessionId}:${event.at ?? "unknown"}`,
        kind: "plan",
        at: event.at,
        title: "Plan updated",
        body: event.items.map((item) => `${item.status}: ${item.title}`).join(" | "),
        status: `${event.items.length} items`
      };
    case "tool.call.started":
      return {
        id: `${event.type}:${event.toolCall.id}:${event.at ?? "unknown"}`,
        kind: "tool",
        at: event.at,
        title: event.toolCall.name,
        body: event.toolCall.inputSummary,
        status: event.toolCall.status
      };
    case "tool.call.updated":
      return {
        id: `${event.type}:${event.toolCallId}:${event.at ?? "unknown"}`,
        kind: "tool",
        at: event.at,
        title: `Tool ${event.toolCallId}`,
        body: event.outputSummary,
        status: event.status
      };
    case "command.output":
      return {
        id: `${event.type}:${event.commandId}:${event.at ?? "unknown"}:${event.stream}`,
        kind: "command",
        at: event.at,
        title: event.commandId,
        body: event.text,
        status: event.status ?? event.stream
      };
    case "diff.emitted":
      return {
        id: `${event.type}:${event.diff.id}:${event.at ?? "unknown"}`,
        kind: "diff",
        at: event.at,
        title: event.diff.title ?? event.diff.id,
        body: `${event.diff.files.length} file(s)`,
        status: summarizeDiff(event.diff.files.length)
      };
    case "usage.reported":
      return {
        id: `${event.type}:${event.usage.id}:${event.at ?? "unknown"}`,
        kind: "usage",
        at: event.at,
        title: event.usage.model ? `Usage ${event.usage.model}` : "Usage reported",
        body: describeUsage(event.usage),
        status: event.usage.source
      };
    case "approval.requested":
      return {
        id: `${event.type}:${event.approval.id}:${event.at ?? "unknown"}`,
        kind: "approval",
        at: event.at,
        title: event.approval.title,
        body: event.approval.subject ?? event.approval.reason,
        status: "pending"
      };
    case "approval.resolved":
      return {
        id: `${event.type}:${event.approvalId}:${event.at ?? "unknown"}`,
        kind: "approval",
        at: event.at,
        title: `Approval ${event.approvalId}`,
        status: describeApprovalDecision(event.decision)
      };
    case "warning":
      return {
        id: `${event.type}:${event.id}:${event.at ?? "unknown"}`,
        kind: "warning",
        at: event.at,
        title: "Warning",
        body: event.message,
        status: "warning"
      };
    case "error":
      return {
        id: `${event.type}:${event.id}:${event.at ?? "unknown"}`,
        kind: "error",
        at: event.at,
        title: "Error",
        body: event.message,
        status: "error"
      };
  }
}

function projectWorkspaceSummaries(
  sessions: readonly WorkbenchSessionSnapshot[]
): readonly ProjectedWorkspaceSummary[] {
  const byPath = new Map<string, ProjectedWorkspaceSummary>();

  sessions.forEach((session) => {
    if (!session.workspacePath) {
      return;
    }

    const current = byPath.get(session.workspacePath);
    const next: ProjectedWorkspaceSummary = current
      ? {
          ...current,
          sessionCount: current.sessionCount + 1,
          updatedAt: compareMaybeIso(session.updatedAt, current.updatedAt) > 0
            ? session.updatedAt
            : current.updatedAt
        }
      : {
          path: session.workspacePath,
          label: basename(session.workspacePath),
          sessionCount: 1,
          updatedAt: session.updatedAt
        };

    byPath.set(session.workspacePath, next);
  });

  return Array.from(byPath.values()).sort((left, right) =>
    compareMaybeIso(right.updatedAt, left.updatedAt) || left.label.localeCompare(right.label)
  );
}

function describeContextAttachment(
  attachment: WorkbenchSessionSnapshot["contextAttachments"][string]
): string {
  return [
    attachment.path,
    attachment.range ? describeContextRange(attachment.range) : undefined,
    attachment.summary
  ]
    .filter((value): value is string => Boolean(value))
    .join(" | ");
}

function describeContextRange(
  range: NonNullable<WorkbenchSessionSnapshot["contextAttachments"][string]["range"]>
): string {
  const start = `${range.startLine}${range.startColumn ? `:${range.startColumn}` : ""}`;
  const end = range.endLine
    ? `${range.endLine}${range.endColumn ? `:${range.endColumn}` : ""}`
    : undefined;

  return end ? `L${start}-L${end}` : `L${start}`;
}

function projectWorkspaceSummariesFromIndex(
  sessions: readonly WorkbenchSessionIndexEntry[]
): readonly ProjectedWorkspaceSummary[] {
  const byPath = new Map<string, ProjectedWorkspaceSummary>();

  sessions.forEach((session) => {
    if (!session.workspacePath) {
      return;
    }

    const current = byPath.get(session.workspacePath);
    const next: ProjectedWorkspaceSummary = current
      ? {
          ...current,
          sessionCount: current.sessionCount + 1,
          updatedAt: compareMaybeIso(session.updatedAt, current.updatedAt) > 0
            ? session.updatedAt
            : current.updatedAt
        }
      : {
          path: session.workspacePath,
          label: basename(session.workspacePath),
          sessionCount: 1,
          updatedAt: session.updatedAt
        };

    byPath.set(session.workspacePath, next);
  });

  return Array.from(byPath.values()).sort((left, right) =>
    compareMaybeIso(right.updatedAt, left.updatedAt) || left.label.localeCompare(right.label)
  );
}

function projectBackendStatuses(
  sessions: readonly WorkbenchSessionSnapshot[]
): readonly ProjectedBackendStatus[] {
  const statuses = new Map<string, ProjectedBackendStatus>();

  sessions
    .slice()
    .sort((left, right) => compareMaybeIso(right.updatedAt, left.updatedAt))
    .forEach((session) => {
      const selection = session.selection;
      const backendAdapterId = selection?.backendAdapterId;
      const label = selection?.backendAdapter?.label;

      if (!backendAdapterId || !label || statuses.has(backendAdapterId)) {
        return;
      }

      const warning = selection.capabilityWarnings?.[0];
      const providerKeyMissing = selection.providerRoute?.apiKeyState === "missing";

      statuses.set(backendAdapterId, {
        backendAdapterId,
        label,
        level: warning || providerKeyMissing ? "attention" : "ready",
        detail:
          warning ??
          (providerKeyMissing
            ? `${selection.providerRoute?.label ?? "provider route"} key metadata is missing`
            : selection.providerRoute?.label ?? "Selection metadata available"),
        relatedSessionId: session.id
      });
    });

  return Array.from(statuses.values());
}

function projectBackendStatusesFromIndex(
  sessions: readonly WorkbenchSessionIndexEntry[]
): readonly ProjectedBackendStatus[] {
  const statuses = new Map<string, ProjectedBackendStatus>();

  sessions
    .slice()
    .sort((left, right) => compareMaybeIso(right.updatedAt, left.updatedAt))
    .forEach((session) => {
      const backendAdapterId = session.backendAdapterId;
      const label = session.backendLabel;

      if (!backendAdapterId || !label || statuses.has(backendAdapterId)) {
        return;
      }

      statuses.set(backendAdapterId, {
        backendAdapterId,
        label,
        level: session.capabilityWarning || session.providerKeyMissing ? "attention" : "ready",
        detail:
          session.capabilityWarning ??
          (session.providerKeyMissing
            ? `${session.providerRouteLabel ?? "provider route"} key metadata is missing`
            : session.providerRouteLabel ?? "Selection metadata available"),
        relatedSessionId: session.id
      });
    });

  return Array.from(statuses.values());
}

function describeSessionLifecycle(lifecycle: WorkbenchSessionLifecycle): string {
  switch (lifecycle) {
    case "created":
      return "Session created";
    case "started":
      return "Session started";
    case "resumed":
      return "Session resumed";
    case "paused":
      return "Session paused";
    case "completed":
      return "Session completed";
    case "failed":
      return "Session failed";
  }
}

function describeApprovalDecision(decision: ApprovalDecision): string {
  switch (decision) {
    case "approved":
      return "approved";
    case "rejected":
      return "rejected";
    case "cancelled":
      return "cancelled";
  }
}

function summarizeDiff(fileCount: number): string {
  return fileCount === 1 ? "1 file" : `${fileCount} files`;
}

function describeUsage(
  usage: WorkbenchSessionSnapshot["usageReports"][string]
): string | undefined {
  const parts = [
    usage.inputTokens === undefined ? undefined : `input ${usage.inputTokens}`,
    usage.outputTokens === undefined ? undefined : `output ${usage.outputTokens}`,
    usage.cacheReadInputTokens === undefined ? undefined : `cache read ${usage.cacheReadInputTokens}`,
    usage.costUsd === undefined ? undefined : `$${usage.costUsd.toFixed(4)}`
  ].filter((part): part is string => part !== undefined);

  return parts.length > 0 ? parts.join(" / ") : usage.note;
}

function basename(path: string): string {
  const pieces = path.split("/").filter((piece) => piece.length > 0);
  return pieces[pieces.length - 1] ?? path;
}

function compareMaybeIso(left: string | undefined, right: string | undefined): number {
  return (left ?? "").localeCompare(right ?? "");
}
