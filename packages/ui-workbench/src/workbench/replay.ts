import type {
  CommandOutputStream,
  CommandStatus,
  WorkbenchApprovalSnapshot,
  WorkbenchAdapterSessionLinkSnapshot,
  WorkbenchContextAttachmentSnapshot,
  WorkbenchDiffSnapshot,
  WorkbenchEvent,
  WorkbenchPlanItemSnapshot,
  WorkbenchSessionLifecycle,
  WorkbenchToolCallSnapshot,
  WorkbenchUsageSnapshot
} from "./events.js";
import type { WorkbenchSelectionSnapshot } from "./selection.js";

export interface AssistantMessageSnapshot {
  readonly id: string;
  readonly role: "assistant";
  readonly text: string;
  readonly status: "streaming" | "completed";
}

export interface CommandOutputChunkSnapshot {
  readonly stream: CommandOutputStream;
  readonly text: string;
  readonly at?: string;
}

export interface CommandOutputSnapshot {
  readonly id: string;
  readonly status: CommandStatus;
  readonly exitCode?: number;
  readonly chunks: readonly CommandOutputChunkSnapshot[];
}

export interface WorkbenchNoticeSnapshot {
  readonly id: string;
  readonly level: "warning" | "error";
  readonly message: string;
  readonly at?: string;
}

export interface WorkbenchSessionSnapshot {
  readonly id: string;
  readonly lifecycle: WorkbenchSessionLifecycle;
  readonly title?: string;
  readonly workspacePath?: string;
  readonly selection?: WorkbenchSelectionSnapshot;
  readonly externalSessions: Readonly<Record<string, WorkbenchAdapterSessionLinkSnapshot>>;
  readonly contextAttachments: Readonly<Record<string, WorkbenchContextAttachmentSnapshot>>;
  readonly assistantMessages: Readonly<Record<string, AssistantMessageSnapshot>>;
  readonly plan: readonly WorkbenchPlanItemSnapshot[];
  readonly toolCalls: Readonly<Record<string, WorkbenchToolCallSnapshot>>;
  readonly commandOutputs: Readonly<Record<string, CommandOutputSnapshot>>;
  readonly diffs: Readonly<Record<string, WorkbenchDiffSnapshot>>;
  readonly usageReports: Readonly<Record<string, WorkbenchUsageSnapshot>>;
  readonly approvals: Readonly<Record<string, WorkbenchApprovalSnapshot>>;
  readonly pendingApprovalIds: readonly string[];
  readonly notices: readonly WorkbenchNoticeSnapshot[];
  readonly updatedAt?: string;
}

export interface WorkbenchStateSnapshot {
  readonly activeSessionId?: string;
  readonly sessions: Readonly<Record<string, WorkbenchSessionSnapshot>>;
}

export function createEmptyWorkbenchState(): WorkbenchStateSnapshot {
  return {
    sessions: {}
  };
}

export function replayWorkbenchEvents(
  events: readonly WorkbenchEvent[],
  initialState: WorkbenchStateSnapshot = createEmptyWorkbenchState()
): WorkbenchStateSnapshot {
  return events.reduce(applyWorkbenchEvent, initialState);
}

export function applyWorkbenchEvent(
  state: WorkbenchStateSnapshot,
  event: WorkbenchEvent
): WorkbenchStateSnapshot {
  const session = ensureSession(state, event.sessionId);

  switch (event.type) {
    case "session.lifecycle":
      return putSession(state, {
        ...session,
        lifecycle: event.lifecycle,
        title: event.title ?? session.title,
        workspacePath: event.workspacePath ?? session.workspacePath,
        selection: event.selection ?? session.selection,
        updatedAt: event.at ?? session.updatedAt
      });
    case "selection.snapshot.updated":
      return putSession(state, {
        ...session,
        selection: event.selection,
        updatedAt: event.at ?? session.updatedAt
      });
    case "session.adapter.linked":
      return putSession(state, {
        ...session,
        externalSessions: {
          ...session.externalSessions,
          [event.adapterId]: {
            adapterId: event.adapterId,
            externalSessionId: event.externalSessionId,
            resumedFromExternalSessionId: event.resumedFromExternalSessionId,
            linkedAt: event.at
          }
        },
        updatedAt: event.at ?? session.updatedAt
      });
    case "context.attached":
      return putSession(state, {
        ...session,
        contextAttachments: {
          ...session.contextAttachments,
          [event.attachment.id]: {
            ...event.attachment,
            attachedAt: event.attachment.attachedAt ?? event.at
          }
        },
        updatedAt: event.at ?? session.updatedAt
      });
    case "assistant.text.delta": {
      const previous = session.assistantMessages[event.messageId] ?? {
        id: event.messageId,
        role: "assistant" as const,
        text: "",
        status: "streaming" as const
      };
      return putSession(state, {
        ...session,
        assistantMessages: {
          ...session.assistantMessages,
          [event.messageId]: {
            ...previous,
            text: `${previous.text}${event.text}`,
            status: "streaming"
          }
        },
        updatedAt: event.at ?? session.updatedAt
      });
    }
    case "assistant.text.completed": {
      const previous = session.assistantMessages[event.messageId] ?? {
        id: event.messageId,
        role: "assistant" as const,
        text: "",
        status: "streaming" as const
      };
      return putSession(state, {
        ...session,
        assistantMessages: {
          ...session.assistantMessages,
          [event.messageId]: {
            ...previous,
            text: event.text ?? previous.text,
            status: "completed"
          }
        },
        updatedAt: event.at ?? session.updatedAt
      });
    }
    case "plan.updated":
      return putSession(state, {
        ...session,
        plan: event.items,
        updatedAt: event.at ?? session.updatedAt
      });
    case "tool.call.started":
      return putSession(state, {
        ...session,
        toolCalls: {
          ...session.toolCalls,
          [event.toolCall.id]: event.toolCall
        },
        updatedAt: event.at ?? session.updatedAt
      });
    case "tool.call.updated": {
      const previous = session.toolCalls[event.toolCallId] ?? {
        id: event.toolCallId,
        name: "unknown",
        status: "pending" as const
      };
      return putSession(state, {
        ...session,
        toolCalls: {
          ...session.toolCalls,
          [event.toolCallId]: {
            ...previous,
            status: event.status ?? previous.status,
            outputSummary: event.outputSummary ?? previous.outputSummary
          }
        },
        updatedAt: event.at ?? session.updatedAt
      });
    }
    case "command.output": {
      const previous = session.commandOutputs[event.commandId] ?? {
        id: event.commandId,
        status: "running" as const,
        chunks: []
      };
      return putSession(state, {
        ...session,
        commandOutputs: {
          ...session.commandOutputs,
          [event.commandId]: {
            ...previous,
            status: event.status ?? previous.status,
            exitCode: event.exitCode ?? previous.exitCode,
            chunks: [
              ...previous.chunks,
              {
                stream: event.stream,
                text: event.text,
                at: event.at
              }
            ]
          }
        },
        updatedAt: event.at ?? session.updatedAt
      });
    }
    case "diff.emitted":
      return putSession(state, {
        ...session,
        diffs: {
          ...session.diffs,
          [event.diff.id]: event.diff
        },
        updatedAt: event.at ?? session.updatedAt
      });
    case "usage.reported":
      return putSession(state, {
        ...session,
        usageReports: {
          ...session.usageReports,
          [event.usage.id]: event.usage
        },
        updatedAt: event.at ?? session.updatedAt
      });
    case "approval.requested":
      return putSession(state, {
        ...session,
        approvals: {
          ...session.approvals,
          [event.approval.id]: {
            ...event.approval,
            status: "pending",
            requestedAt: event.approval.requestedAt ?? event.at
          }
        },
        pendingApprovalIds: appendUnique(session.pendingApprovalIds, event.approval.id),
        updatedAt: event.at ?? session.updatedAt
      });
    case "approval.resolved": {
      const previous = session.approvals[event.approvalId];
      return putSession(state, {
        ...session,
        approvals: {
          ...session.approvals,
          [event.approvalId]: {
            ...(previous ?? {
              id: event.approvalId,
              kind: "command" as const,
              title: "Unknown approval"
            }),
            status: "resolved",
            decision: event.decision,
            resolvedAt: event.at
          }
        },
        pendingApprovalIds: session.pendingApprovalIds.filter((id) => id !== event.approvalId),
        updatedAt: event.at ?? session.updatedAt
      });
    }
    case "warning":
    case "error":
      return putSession(state, {
        ...session,
        notices: [
          ...session.notices,
          {
            id: event.id,
            level: event.type,
            message: event.message,
            at: event.at
          }
        ],
        updatedAt: event.at ?? session.updatedAt
      });
  }
}

export function isDeterministicReplay(events: readonly WorkbenchEvent[]): boolean {
  return JSON.stringify(replayWorkbenchEvents(events)) === JSON.stringify(replayWorkbenchEvents(events));
}

function ensureSession(
  state: WorkbenchStateSnapshot,
  sessionId: string
): WorkbenchSessionSnapshot {
  return (
    state.sessions[sessionId] ?? {
      id: sessionId,
      lifecycle: "created",
      externalSessions: {},
      contextAttachments: {},
      assistantMessages: {},
      plan: [],
      toolCalls: {},
      commandOutputs: {},
      diffs: {},
      usageReports: {},
      approvals: {},
      pendingApprovalIds: [],
      notices: []
    }
  );
}

function putSession(
  state: WorkbenchStateSnapshot,
  session: WorkbenchSessionSnapshot
): WorkbenchStateSnapshot {
  return {
    ...state,
    activeSessionId: session.id,
    sessions: {
      ...state.sessions,
      [session.id]: session
    }
  };
}

function appendUnique(values: readonly string[], value: string): readonly string[] {
  return values.includes(value) ? values : [...values, value];
}
