import type {
  ApprovalDecision,
  CommandStatus,
  WorkbenchEvent,
  WorkbenchProviderRouteHealthStatus,
  WorkbenchRunAttemptSnapshot,
  WorkbenchRunnerIssueKind,
  WorkbenchRunnerIssueSuggestedAction,
  WorkbenchSessionLifecycle,
  WorkbenchStreamQuality
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
  | "artifact"
  | "run"
  | "issue"
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

/**
 * Chat-centric transcript model. Events are grouped into conversational turns:
 * a user turn (the user's message) followed by an assistant turn (one or more
 * streamed assistant messages plus collapsed activity such as tool calls,
 * commands, diffs, plan/usage, and warnings). This is rendered by the chat
 * transcript pane; the flat `timeline` is kept for the inspector/debug view.
 */
export type ChatActivityKind = Exclude<
  WorkbenchTimelineEntryKind,
  "session" | "adapter" | "selection" | "context" | "assistant"
>;

export interface ChatActivityEntry {
  readonly id: string;
  readonly kind: ChatActivityKind;
  readonly at?: string;
  readonly title: string;
  readonly body?: string;
  readonly status?: string;
}

export interface ChatAssistantMessage {
  readonly messageId: string;
  readonly text: string;
  readonly streaming: boolean;
  readonly at?: string;
}

export interface ChatUserTurn {
  readonly kind: "user";
  readonly id: string;
  readonly text: string;
  readonly at?: string;
}

export interface ChatAssistantTurn {
  readonly kind: "assistant";
  readonly id: string;
  readonly messages: readonly ChatAssistantMessage[];
  readonly activity: readonly ChatActivityEntry[];
  readonly streaming: boolean;
  readonly at?: string;
}

export type ChatTurn = ChatUserTurn | ChatAssistantTurn;

const CHAT_ACTIVITY_KINDS: readonly ChatActivityKind[] = [
  "plan",
  "tool",
  "command",
  "diff",
  "usage",
  "artifact",
  "run",
  "issue",
  "approval",
  "warning",
  "error"
];

function isChatActivityKind(kind: WorkbenchTimelineEntryKind): kind is ChatActivityKind {
  return (CHAT_ACTIVITY_KINDS as readonly string[]).includes(kind);
}

export interface ProjectedSessionListItem {
  readonly id: string;
  readonly title: string;
  readonly lifecycle: WorkbenchSessionLifecycle;
  readonly workspacePath?: string;
  readonly backendAdapterId?: string;
  readonly backendLabel?: string;
  readonly updatedAt?: string;
  readonly resumable: boolean;
  readonly pendingApprovalCount: number;
  readonly warningCount: number;
  readonly errorCount: number;
  readonly source?: "app" | "claude" | "codex";
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

export interface ProjectedProviderRouteHealth {
  readonly providerRouteId: string;
  readonly latestHealth: WorkbenchProviderRouteHealthStatus;
  readonly latestIssueKind?: WorkbenchRunnerIssueKind;
  readonly latestIssueTitle?: string;
  readonly latestIssueMessage?: string;
  readonly latestAttemptStatus?: WorkbenchRunAttemptSnapshot["status"];
  readonly issueCount: number;
  readonly successfulAttemptCount: number;
  readonly retryableIssueCount: number;
  readonly lastDetectedAt?: string;
  readonly suggestedActions: readonly WorkbenchRunnerIssueSuggestedAction[];
  readonly modelProfileIds: readonly string[];
}

export interface ProjectedLiveRunContinuity {
  readonly latestAttemptId?: string;
  readonly latestAttemptStatus?: WorkbenchRunAttemptSnapshot["status"];
  readonly latestExternalSessionId?: string;
  readonly latestStreamQuality: WorkbenchStreamQuality;
  readonly totalAttemptCount: number;
  readonly resumeAttemptCount: number;
  readonly approvalFollowUpAttemptCount: number;
  readonly cleanStreamAttemptCount: number;
  readonly warningStreamAttemptCount: number;
  readonly latestStartedAt?: string;
  readonly latestFinishedAt?: string;
}

export type ProjectedLiveRunGuidanceKind =
  | "idle"
  | "running"
  | "healthy"
  | "stream_warning"
  | "resume_available"
  | "retry_later"
  | "switch_route"
  | "lower_model"
  | "check_key"
  | "inspect_terminal";
export type ProjectedLiveRunGuidanceSeverity = "info" | "success" | "warning" | "error";
export type ProjectedLiveRunNextAction =
  | "start_live_run"
  | "watch_stream"
  | "review_evidence"
  | "inspect_terminal"
  | "resume_session"
  | "retry_later"
  | "switch_route"
  | "lower_model"
  | "check_key"
  | "queue_recovery_brief";

export interface ProjectedLiveRunGuidance {
  readonly kind: ProjectedLiveRunGuidanceKind;
  readonly severity: ProjectedLiveRunGuidanceSeverity;
  readonly canResume: boolean;
  readonly latestAttemptId?: string;
  readonly latestIssueId?: string;
  readonly latestIssueKind?: WorkbenchRunnerIssueKind;
  readonly suggestedAction?: WorkbenchRunnerIssueSuggestedAction;
  readonly routeHealth?: WorkbenchProviderRouteHealthStatus;
  readonly streamQuality: WorkbenchStreamQuality;
  readonly nextActions: readonly ProjectedLiveRunNextAction[];
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
  readonly artifacts: readonly WorkbenchSessionSnapshot["artifacts"][string][];
  readonly runAttempts: readonly WorkbenchSessionSnapshot["runAttempts"][string][];
  readonly runnerIssues: readonly WorkbenchSessionSnapshot["runnerIssues"][string][];
  readonly providerRouteHealth: readonly ProjectedProviderRouteHealth[];
  readonly liveRunContinuity: ProjectedLiveRunContinuity;
  readonly liveRunGuidance: ProjectedLiveRunGuidance;
  readonly approvals: readonly WorkbenchSessionSnapshot["approvals"][string][];
  readonly notices: WorkbenchSessionSnapshot["notices"];
  readonly timeline: readonly WorkbenchTimelineEntry[];
  readonly messages: readonly ChatTurn[];
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
    backendAdapterId: session.selection?.backendAdapterId,
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
    backendAdapterId: entry.backendAdapterId,
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
  const runnerIssues = Object.values(session.runnerIssues).sort(compareRunnerIssuesByRecency);
  const runAttempts = Object.values(session.runAttempts).sort(compareRunAttemptsByRecency);
  const liveRunContinuity = projectLiveRunContinuity(runAttempts);

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
    artifacts: Object.values(session.artifacts),
    runAttempts,
    runnerIssues,
    providerRouteHealth: projectProviderRouteHealth(runnerIssues, runAttempts),
    liveRunContinuity,
    liveRunGuidance: projectLiveRunGuidance(runAttempts, runnerIssues, liveRunContinuity),
    approvals: Object.values(session.approvals),
    notices: session.notices,
    timeline: events.map(projectTimelineEntry).filter((entry): entry is WorkbenchTimelineEntry => entry !== undefined),
    messages: projectChatTranscript(events)
  };
}

/**
 * Groups a session's events into conversational chat turns (user/assistant).
 * Assistant text deltas for the same messageId are accumulated into a single
 * streaming message and finalized on `assistant.text.completed`, eliminating
 * the per-delta card noise of the flat timeline. Non-conversational events
 * (tool calls, commands, diffs, plan/usage, warnings) attach as collapsed
 * activity to the surrounding assistant turn.
 */
function projectChatTranscript(events: readonly WorkbenchEvent[]): readonly ChatTurn[] {
  type MutableMessage = { messageId: string; text: string; streaming: boolean; at?: string };
  type MutableAssistantTurn = {
    id: string;
    messages: MutableMessage[];
    activity: ChatActivityEntry[];
    at?: string;
  };

  const turns: ChatTurn[] = [];
  let assistant: MutableAssistantTurn | null = null;

  const ensureAssistantTurn = (at?: string): MutableAssistantTurn => {
    if (!assistant) {
      assistant = {
        id: `assistant-turn-${turns.length}-${at ?? "unknown"}`,
        messages: [],
        activity: [],
        at
      };
    }
    return assistant;
  };

  const flushAssistantTurn = () => {
    if (!assistant) {
      return;
    }
    const snapshot = assistant;
    turns.push({
      kind: "assistant",
      id: snapshot.id,
      messages: snapshot.messages.map((message) => ({ ...message })),
      activity: snapshot.activity,
      streaming: snapshot.messages.some((message) => message.streaming),
      at: snapshot.at
    });
    assistant = null;
  };

  for (const event of events) {
    if (event.type === "user.message") {
      flushAssistantTurn();
      turns.push({
        kind: "user",
        id: `user-${event.messageId ?? event.at ?? turns.length}`,
        text: event.text,
        at: event.at
      });
      continue;
    }

    if (event.type === "assistant.text.delta") {
      const turn = ensureAssistantTurn(event.at);
      let message = turn.messages.find((entry) => entry.messageId === event.messageId);
      if (!message) {
        message = { messageId: event.messageId, text: "", streaming: true, at: event.at };
        turn.messages.push(message);
      }
      message.text = `${message.text}${event.text}`;
      message.streaming = true;
      continue;
    }

    if (event.type === "assistant.text.completed") {
      const turn = ensureAssistantTurn(event.at);
      let message = turn.messages.find((entry) => entry.messageId === event.messageId);
      if (!message) {
        message = { messageId: event.messageId, text: event.text ?? "", streaming: false, at: event.at };
        turn.messages.push(message);
      } else {
        if (event.text !== undefined) {
          message.text = event.text;
        }
        message.streaming = false;
      }
      continue;
    }

    const entry = projectTimelineEntry(event);
    if (entry && isChatActivityKind(entry.kind)) {
      ensureAssistantTurn(entry.at).activity.push({
        id: entry.id,
        kind: entry.kind,
        at: entry.at,
        title: entry.title,
        body: entry.body,
        status: entry.status
      });
    }
  }

  flushAssistantTurn();
  return turns;
}

export function deriveRunAttemptStreamQuality(
  attempt: WorkbenchRunAttemptSnapshot
): WorkbenchStreamQuality {
  if (attempt.status === "cancelled") {
    return "cancelled";
  }
  if (attempt.status === "failed" || attempt.failureKind) {
    return "failed";
  }
  if (attempt.status === "running") {
    return "pending";
  }
  if ((attempt.ignoredRecordCount ?? 0) > 0 || (attempt.parseWarningCount ?? 0) > 0) {
    return "warning";
  }

  return "clean";
}

function projectLiveRunContinuity(
  runAttempts: readonly WorkbenchRunAttemptSnapshot[]
): ProjectedLiveRunContinuity {
  const latestAttempt = runAttempts[0];
  const qualityCounts = runAttempts.reduce(
    (counts, attempt) => {
      const quality = deriveRunAttemptStreamQuality(attempt);
      if (quality === "clean") {
        counts.clean += 1;
      }
      if (quality === "warning") {
        counts.warning += 1;
      }
      return counts;
    },
    { clean: 0, warning: 0 }
  );

  return {
    latestAttemptId: latestAttempt?.id,
    latestAttemptStatus: latestAttempt?.status,
    latestExternalSessionId:
      latestAttempt?.externalSessionId ?? latestAttempt?.resumedFromExternalSessionId,
    latestStreamQuality: latestAttempt
      ? deriveRunAttemptStreamQuality(latestAttempt)
      : "pending",
    totalAttemptCount: runAttempts.length,
    resumeAttemptCount: runAttempts.filter(
      (attempt) => attempt.trigger === "manual_resume" || Boolean(attempt.resumedFromExternalSessionId)
    ).length,
    approvalFollowUpAttemptCount: runAttempts.filter(
      (attempt) => attempt.trigger === "approval_follow_up"
    ).length,
    cleanStreamAttemptCount: qualityCounts.clean,
    warningStreamAttemptCount: qualityCounts.warning,
    latestStartedAt: latestAttempt?.startedAt,
    latestFinishedAt: latestAttempt?.finishedAt
  };
}

function projectLiveRunGuidance(
  runAttempts: readonly WorkbenchRunAttemptSnapshot[],
  runnerIssues: readonly WorkbenchSessionSnapshot["runnerIssues"][string][],
  continuity: ProjectedLiveRunContinuity
): ProjectedLiveRunGuidance {
  const latestAttempt = runAttempts[0];
  if (!latestAttempt) {
    return {
      kind: "idle",
      severity: "info",
      canResume: false,
      streamQuality: "pending",
      nextActions: ["start_live_run"]
    };
  }

  const streamQuality = deriveRunAttemptStreamQuality(latestAttempt);
  const canResume = Boolean(
    latestAttempt.externalSessionId ??
      latestAttempt.resumedFromExternalSessionId ??
      continuity.latestExternalSessionId
  );
  const attemptIssue = runnerIssues.find((issue) => issue.attemptId === latestAttempt.id);
  const issue = attemptIssue;

  if (latestAttempt.status === "running") {
    return {
      kind: "running",
      severity: "info",
      canResume: false,
      latestAttemptId: latestAttempt.id,
      streamQuality,
      nextActions: ["watch_stream", "inspect_terminal"]
    };
  }

  if (latestAttempt.status === "succeeded") {
    const kind = streamQuality === "warning" ? "stream_warning" : "healthy";

    return {
      kind,
      severity: streamQuality === "warning" ? "warning" : "success",
      canResume: false,
      latestAttemptId: latestAttempt.id,
      streamQuality,
      nextActions: projectLiveRunNextActions(kind, false)
    };
  }

  if (issue) {
    const kind = guidanceKindForIssue(issue, canResume);

    return {
      kind,
      severity: issue.severity === "error" ? "error" : "warning",
      canResume,
      latestAttemptId: latestAttempt.id,
      latestIssueId: issue.id,
      latestIssueKind: issue.kind,
      suggestedAction: issue.suggestedAction,
      routeHealth: issue.routeHealth,
      streamQuality,
      nextActions: projectLiveRunNextActions(kind, canResume)
    };
  }

  const kind = canResume ? "resume_available" : "inspect_terminal";

  return {
    kind,
    severity: latestAttempt.status === "cancelled" ? "warning" : "error",
    canResume,
    latestAttemptId: latestAttempt.id,
    streamQuality,
    nextActions: projectLiveRunNextActions(kind, canResume)
  };
}

function projectLiveRunNextActions(
  kind: ProjectedLiveRunGuidanceKind,
  canResume: boolean
): readonly ProjectedLiveRunNextAction[] {
  switch (kind) {
    case "idle":
      return ["start_live_run"];
    case "running":
      return ["watch_stream", "inspect_terminal"];
    case "healthy":
      return ["review_evidence"];
    case "stream_warning":
      return ["inspect_terminal", "queue_recovery_brief"];
    case "resume_available":
      return ["resume_session", "queue_recovery_brief", "inspect_terminal"];
    case "retry_later":
      return canResume
        ? ["retry_later", "resume_session", "inspect_terminal"]
        : ["retry_later", "inspect_terminal"];
    case "switch_route":
      return canResume
        ? ["switch_route", "resume_session", "inspect_terminal"]
        : ["switch_route", "inspect_terminal"];
    case "lower_model":
      return canResume
        ? ["lower_model", "resume_session", "inspect_terminal"]
        : ["lower_model", "inspect_terminal"];
    case "check_key":
      return ["check_key"];
    case "inspect_terminal":
      return canResume
        ? ["inspect_terminal", "resume_session", "queue_recovery_brief"]
        : ["inspect_terminal", "queue_recovery_brief"];
  }
}

function guidanceKindForIssue(
  issue: WorkbenchSessionSnapshot["runnerIssues"][string],
  canResume: boolean
): ProjectedLiveRunGuidanceKind {
  if (issue.kind === "provider_auth" || issue.kind === "readiness_blocked") {
    return "check_key";
  }
  if (issue.suggestedAction === "retry_later") {
    return "retry_later";
  }
  if (issue.suggestedAction === "switch_route") {
    return "switch_route";
  }
  if (issue.suggestedAction === "lower_model") {
    return "lower_model";
  }
  if (issue.suggestedAction === "check_key") {
    return "check_key";
  }
  if (issue.suggestedAction === "inspect_terminal") {
    return canResume ? "resume_available" : "inspect_terminal";
  }

  return canResume ? "resume_available" : "inspect_terminal";
}

function projectProviderRouteHealth(
  issues: readonly WorkbenchSessionSnapshot["runnerIssues"][string][],
  runAttempts: readonly WorkbenchRunAttemptSnapshot[]
): readonly ProjectedProviderRouteHealth[] {
  const byRoute = new Map<
    string,
    {
      providerRouteId: string;
      latestHealth: WorkbenchProviderRouteHealthStatus;
      latestIssueKind?: WorkbenchRunnerIssueKind;
      latestIssueTitle?: string;
      latestIssueMessage?: string;
      latestAttemptStatus?: WorkbenchRunAttemptSnapshot["status"];
      issueCount: number;
      successfulAttemptCount: number;
      retryableIssueCount: number;
      lastDetectedAt?: string;
      suggestedActions: Set<WorkbenchRunnerIssueSuggestedAction>;
      modelProfileIds: Set<string>;
    }
  >();

  issues.forEach((issue) => {
    const providerRouteId = issue.providerRouteId ?? "unknown-provider-route";
    const current = byRoute.get(providerRouteId);
    const nextDetectedAt = issue.detectedAt;
    const isNewer =
      !current ||
      compareMaybeIso(nextDetectedAt, current.lastDetectedAt) >= 0;
    const entry = current ?? {
      providerRouteId,
      latestHealth: "unknown" as WorkbenchProviderRouteHealthStatus,
      issueCount: 0,
      successfulAttemptCount: 0,
      retryableIssueCount: 0,
      suggestedActions: new Set<WorkbenchRunnerIssueSuggestedAction>(),
      modelProfileIds: new Set<string>()
    };

    entry.issueCount += 1;
    entry.retryableIssueCount += issue.retryable ? 1 : 0;
    entry.suggestedActions.add(issue.suggestedAction);
    if (issue.modelProfileId) {
      entry.modelProfileIds.add(issue.modelProfileId);
    }
    if (isNewer) {
      entry.latestHealth = issue.routeHealth ?? "unknown";
      entry.latestIssueKind = issue.kind;
      entry.latestIssueTitle = issue.title;
      entry.latestIssueMessage = issue.message;
      entry.latestAttemptStatus = undefined;
      entry.lastDetectedAt = nextDetectedAt;
    }

    byRoute.set(providerRouteId, entry);
  });

  runAttempts.forEach((attempt) => {
    const providerRouteId = attempt.providerRouteId;
    if (!providerRouteId) {
      return;
    }

    const current = byRoute.get(providerRouteId);
    const nextDetectedAt = attempt.finishedAt ?? attempt.startedAt;
    const isNewer =
      !current ||
      compareMaybeIso(nextDetectedAt, current.lastDetectedAt) >= 0;
    const entry = current ?? {
      providerRouteId,
      latestHealth: "unknown" as WorkbenchProviderRouteHealthStatus,
      issueCount: 0,
      successfulAttemptCount: 0,
      retryableIssueCount: 0,
      suggestedActions: new Set<WorkbenchRunnerIssueSuggestedAction>(),
      modelProfileIds: new Set<string>()
    };

    if (attempt.modelProfileId) {
      entry.modelProfileIds.add(attempt.modelProfileId);
    }
    if (attempt.status === "succeeded") {
      entry.successfulAttemptCount += 1;
    }

    if (isNewer) {
      if (attempt.status === "succeeded") {
        entry.latestHealth = "healthy";
        entry.latestIssueKind = "route_reached";
        entry.latestIssueTitle = undefined;
        entry.latestIssueMessage = undefined;
      } else if (attempt.failureKind && !entry.latestIssueKind) {
        entry.latestIssueKind = attempt.failureKind;
      }
      entry.latestAttemptStatus = attempt.status;
      entry.lastDetectedAt = nextDetectedAt;
    }

    byRoute.set(providerRouteId, entry);
  });

  return Array.from(byRoute.values())
    .map((entry) => ({
      providerRouteId: entry.providerRouteId,
      latestHealth: entry.latestHealth,
      latestIssueKind: entry.latestIssueKind,
      latestIssueTitle: entry.latestIssueTitle,
      latestIssueMessage: entry.latestIssueMessage,
      latestAttemptStatus: entry.latestAttemptStatus,
      issueCount: entry.issueCount,
      successfulAttemptCount: entry.successfulAttemptCount,
      retryableIssueCount: entry.retryableIssueCount,
      lastDetectedAt: entry.lastDetectedAt,
      suggestedActions: Array.from(entry.suggestedActions).sort(),
      modelProfileIds: Array.from(entry.modelProfileIds).sort()
    }))
    .sort((left, right) =>
      compareMaybeIso(right.lastDetectedAt, left.lastDetectedAt) ||
      left.providerRouteId.localeCompare(right.providerRouteId)
    );
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
    case "artifact.emitted":
      return {
        id: `${event.type}:${event.artifact.id}:${event.at ?? "unknown"}`,
        kind: "artifact",
        at: event.at,
        title: event.artifact.title,
        body: event.artifact.summary ?? event.artifact.path,
        status: event.artifact.contentState
      };
    case "run.attempt.started":
      return {
        id: `${event.type}:${event.attempt.id}:${event.at ?? "unknown"}`,
        kind: "run",
        at: event.at,
        title: "Run attempt started",
        body: describeRunAttempt(event.attempt),
        status: "running"
      };
    case "run.attempt.updated":
      return {
        id: `${event.type}:${event.attemptId}:${event.status}:${event.at ?? "unknown"}`,
        kind: "run",
        at: event.at,
        title: `Run attempt ${event.status}`,
        body: describeRunAttemptUpdate(event),
        status: event.failureKind ?? event.status
      };
    case "runner.issue.detected":
      return {
        id: `${event.type}:${event.issue.id}:${event.at ?? "unknown"}`,
        kind: "issue",
        at: event.at,
        title: event.issue.title,
        body: describeRunnerIssue(event.issue),
        status: event.issue.kind
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

function compareRunAttemptsByRecency(
  left: WorkbenchSessionSnapshot["runAttempts"][string],
  right: WorkbenchSessionSnapshot["runAttempts"][string]
): number {
  return compareMaybeIso(right.startedAt ?? right.finishedAt, left.startedAt ?? left.finishedAt);
}

function compareRunnerIssuesByRecency(
  left: WorkbenchSessionSnapshot["runnerIssues"][string],
  right: WorkbenchSessionSnapshot["runnerIssues"][string]
): number {
  return compareMaybeIso(right.detectedAt, left.detectedAt) || left.id.localeCompare(right.id);
}

function describeRunAttempt(
  attempt: WorkbenchSessionSnapshot["runAttempts"][string]
): string {
  return [
    attempt.mode,
    attempt.modelProfileId,
    attempt.routingMode,
    attempt.externalSessionId ? "resume" : undefined
  ]
    .filter((value): value is string => Boolean(value))
    .join(" / ");
}

function describeRunAttemptUpdate(event: Extract<WorkbenchEvent, { type: "run.attempt.updated" }>): string {
  return [
    event.eventCount !== undefined ? `${event.eventCount} event(s)` : undefined,
    event.ignoredRecordCount !== undefined ? `${event.ignoredRecordCount} ignored` : undefined,
    event.parseWarningCount !== undefined ? `${event.parseWarningCount} parse warning(s)` : undefined,
    event.failureKind,
    event.exitCode !== undefined ? `exit ${event.exitCode}` : undefined,
    event.errorMessage
  ]
    .filter((value): value is string => Boolean(value))
    .join(" | ");
}

function describeRunnerIssue(
  issue: WorkbenchSessionSnapshot["runnerIssues"][string]
): string {
  return [
    issue.message,
    issue.providerRouteId ? `route: ${issue.providerRouteId}` : undefined,
    issue.modelProfileId ? `model: ${issue.modelProfileId}` : undefined,
    issue.retryable ? "retryable" : "not retryable",
    `action: ${issue.suggestedAction}`,
    issue.routeHealth ? `health: ${issue.routeHealth}` : undefined
  ]
    .filter((value): value is string => Boolean(value))
    .join(" | ");
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
    usage.thinkingTokens === undefined ? undefined : `thinking ${usage.thinkingTokens}`,
    usage.reasoningTokens === undefined ? undefined : `reasoning ${usage.reasoningTokens}`,
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
