import type {
  WorkbenchAdapterSessionLinkSnapshot,
  WorkbenchEvent,
  WorkbenchSessionLifecycle
} from "./events.js";
import type { WorkbenchSelectionSnapshot } from "./selection.js";

export interface WorkbenchSessionIndexEntry {
  readonly id: string;
  readonly title?: string;
  readonly lifecycle: WorkbenchSessionLifecycle;
  readonly workspacePath?: string;
  readonly backendAdapterId?: string;
  readonly backendLabel?: string;
  readonly providerRouteLabel?: string;
  readonly providerKeyMissing?: boolean;
  readonly capabilityWarning?: string;
  readonly externalSessions: Readonly<Record<string, WorkbenchAdapterSessionLinkSnapshot>>;
  readonly pendingApprovalIds: readonly string[];
  readonly pendingApprovalCount: number;
  readonly warningCount: number;
  readonly errorCount: number;
  readonly updatedAt?: string;
  readonly resumable: boolean;
}

export interface WorkbenchSessionIndexSnapshot {
  readonly sessions: Readonly<Record<string, WorkbenchSessionIndexEntry>>;
}

export function createEmptyWorkbenchSessionIndex(): WorkbenchSessionIndexSnapshot {
  return {
    sessions: {}
  };
}

export function createWorkbenchSessionIndexFromEntries(
  entries: readonly WorkbenchSessionIndexEntry[]
): WorkbenchSessionIndexSnapshot {
  return {
    sessions: Object.fromEntries(entries.map((entry) => [entry.id, normalizeEntry(entry)]))
  };
}

export function buildWorkbenchSessionIndex(
  events: readonly WorkbenchEvent[],
  initialIndex: WorkbenchSessionIndexSnapshot = createEmptyWorkbenchSessionIndex()
): WorkbenchSessionIndexSnapshot {
  return events.reduce(applyWorkbenchSessionIndexEvent, initialIndex);
}

export function applyWorkbenchSessionIndexEvent(
  index: WorkbenchSessionIndexSnapshot,
  event: WorkbenchEvent
): WorkbenchSessionIndexSnapshot {
  const session = ensureSessionIndexEntry(index, event.sessionId);
  const updatedAt = event.at ?? session.updatedAt;

  switch (event.type) {
    case "session.lifecycle":
      return putSessionIndexEntry(index, {
        ...applySelectionToEntry(session, event.selection),
        lifecycle: event.lifecycle,
        title: event.title ?? session.title,
        workspacePath: event.workspacePath ?? session.workspacePath,
        updatedAt
      });
    case "selection.snapshot.updated":
      return putSessionIndexEntry(index, {
        ...applySelectionToEntry(session, event.selection),
        updatedAt
      });
    case "session.adapter.linked":
      return putSessionIndexEntry(index, {
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
        updatedAt
      });
    case "context.attached":
      return putSessionIndexEntry(index, {
        ...session,
        updatedAt
      });
    case "approval.requested": {
      const pendingApprovalIds = appendUnique(
        session.pendingApprovalIds,
        event.approval.id
      );
      return putSessionIndexEntry(index, {
        ...session,
        pendingApprovalIds,
        pendingApprovalCount: pendingApprovalIds.length,
        updatedAt
      });
    }
    case "approval.resolved": {
      const pendingApprovalIds = session.pendingApprovalIds.filter(
        (id) => id !== event.approvalId
      );
      return putSessionIndexEntry(index, {
        ...session,
        pendingApprovalIds,
        pendingApprovalCount: pendingApprovalIds.length,
        updatedAt
      });
    }
    case "warning":
    case "runner.issue.detected":
      return putSessionIndexEntry(index, {
        ...session,
        warningCount: session.warningCount + 1,
        updatedAt
      });
    case "error":
      return putSessionIndexEntry(index, {
        ...session,
        errorCount: session.errorCount + 1,
        updatedAt
      });
    case "assistant.text.delta":
    case "assistant.text.completed":
    case "plan.updated":
    case "tool.call.started":
    case "tool.call.updated":
    case "command.output":
    case "diff.emitted":
    case "usage.reported":
    case "artifact.emitted":
    case "run.attempt.started":
    case "run.attempt.updated":
      return putSessionIndexEntry(index, {
        ...session,
        updatedAt
      });
  }
}

export function deleteWorkbenchSessionFromIndex(
  index: WorkbenchSessionIndexSnapshot,
  sessionId: string
): WorkbenchSessionIndexSnapshot {
  const { [sessionId]: _deleted, ...sessions } = index.sessions;
  return {
    sessions
  };
}

export function listWorkbenchSessionIndexEntries(
  index: WorkbenchSessionIndexSnapshot
): readonly WorkbenchSessionIndexEntry[] {
  return Object.values(index.sessions)
    .map(normalizeEntry)
    .sort(compareSessionIndexEntriesByRecency);
}

function applySelectionToEntry(
  entry: WorkbenchSessionIndexEntry,
  selection: WorkbenchSelectionSnapshot | undefined
): WorkbenchSessionIndexEntry {
  if (!selection) {
    return entry;
  }

  return {
    ...entry,
    backendAdapterId: selection.backendAdapterId,
    backendLabel: selection.backendAdapter?.label,
    providerRouteLabel: selection.providerRoute?.label,
    providerKeyMissing: selection.providerRoute?.apiKeyState === "missing",
    capabilityWarning: selection.capabilityWarnings?.[0]
  };
}

function ensureSessionIndexEntry(
  index: WorkbenchSessionIndexSnapshot,
  sessionId: string
): WorkbenchSessionIndexEntry {
  return (
    index.sessions[sessionId] ?? {
      id: sessionId,
      lifecycle: "created",
      externalSessions: {},
      pendingApprovalIds: [],
      pendingApprovalCount: 0,
      warningCount: 0,
      errorCount: 0,
      resumable: false
    }
  );
}

function putSessionIndexEntry(
  index: WorkbenchSessionIndexSnapshot,
  entry: WorkbenchSessionIndexEntry
): WorkbenchSessionIndexSnapshot {
  const nextEntry = normalizeEntry(entry);
  return {
    sessions: {
      ...index.sessions,
      [nextEntry.id]: nextEntry
    }
  };
}

function normalizeEntry(entry: WorkbenchSessionIndexEntry): WorkbenchSessionIndexEntry {
  return {
    ...entry,
    pendingApprovalCount: entry.pendingApprovalIds.length,
    resumable: isSessionIndexEntryResumable(entry)
  };
}

function isSessionIndexEntryResumable(entry: WorkbenchSessionIndexEntry): boolean {
  return (
    Object.keys(entry.externalSessions).length > 0 &&
    (entry.lifecycle === "completed" ||
      entry.lifecycle === "failed" ||
      entry.lifecycle === "paused")
  );
}

function compareSessionIndexEntriesByRecency(
  left: WorkbenchSessionIndexEntry,
  right: WorkbenchSessionIndexEntry
): number {
  const leftStamp = left.updatedAt ?? "";
  const rightStamp = right.updatedAt ?? "";
  return rightStamp.localeCompare(leftStamp) || compareLabels(left, right);
}

function compareLabels(
  left: WorkbenchSessionIndexEntry,
  right: WorkbenchSessionIndexEntry
): number {
  return (
    (left.title ?? left.id).localeCompare(right.title ?? right.id) ||
    left.id.localeCompare(right.id)
  );
}

function appendUnique(values: readonly string[], value: string): readonly string[] {
  return values.includes(value) ? values : [...values, value];
}
