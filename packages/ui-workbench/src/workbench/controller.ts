import type { WorkbenchEvent } from "./events.js";
import {
  projectWorkbenchSessionIndex,
  type WorkbenchProjection,
  type WorkbenchProjectionOptions
} from "./projection.js";
import type { WorkbenchSelectionSnapshot } from "./selection.js";
import {
  buildWorkbenchSessionIndex,
  deleteWorkbenchSessionFromIndex,
  type WorkbenchSessionIndexSnapshot
} from "./session-index.js";

export interface WorkbenchSessionControllerSnapshot {
  readonly events: readonly WorkbenchEvent[];
  readonly sessionIndex: WorkbenchSessionIndexSnapshot;
  readonly projection: WorkbenchProjection;
  readonly activeSessionId?: string;
}

export interface WorkbenchSessionController {
  readonly getSnapshot: () => WorkbenchSessionControllerSnapshot;
  readonly appendEvents: (
    events: readonly WorkbenchEvent[],
    options?: WorkbenchAppendOptions
  ) => WorkbenchSessionControllerSnapshot;
  readonly setPinnedSessionIds: (
    sessionIds: readonly string[]
  ) => WorkbenchSessionControllerSnapshot;
  readonly deleteSession: (sessionId: string) => WorkbenchSessionControllerSnapshot;
  readonly selectSession: (sessionId: string) => WorkbenchSessionControllerSnapshot;
  readonly loadSessionEvents: (
    sessionId: string,
    events: readonly WorkbenchEvent[]
  ) => WorkbenchSessionControllerSnapshot;
}

export interface WorkbenchSessionControllerOptions {
  readonly initialEvents?: readonly WorkbenchEvent[];
  readonly initialSessionIndex?: WorkbenchSessionIndexSnapshot;
  readonly pinnedSessionIds?: readonly string[];
  readonly activeSessionId?: string;
}

export interface WorkbenchAppendOptions {
  readonly activateSessionId?: string;
}

export interface CreateWorkbenchSessionEventsOptions {
  readonly sessionId: string;
  readonly title: string;
  readonly workspacePath?: string;
  readonly selection?: WorkbenchSelectionSnapshot;
  readonly at?: string;
}

export interface CreateWorkbenchSessionResumeEventsOptions {
  readonly sessionId: string;
  readonly adapterId: string;
  readonly externalSessionId: string;
  readonly resumedFromExternalSessionId?: string;
  readonly at?: string;
}

export function createWorkbenchSessionController(
  options: WorkbenchSessionControllerOptions = {}
): WorkbenchSessionController {
  let events = [...(options.initialEvents ?? [])];
  let sessionIndex = buildWorkbenchSessionIndex(
    events,
    options.initialSessionIndex
  );
  let activeSessionId = options.activeSessionId;
  let pinnedSessionIds = [...(options.pinnedSessionIds ?? [])];

  const createSnapshot = (): WorkbenchSessionControllerSnapshot => {
    const projectionOptions: WorkbenchProjectionOptions = {
      pinnedSessionIds,
      activeSessionId
    };
    const projection = projectWorkbenchSessionIndex(sessionIndex, events, projectionOptions);

    activeSessionId = projection.activeSessionId;

    return {
      events,
      sessionIndex,
      projection,
      activeSessionId
    };
  };

  return {
    getSnapshot: createSnapshot,
    appendEvents: (nextEvents, appendOptions = {}) => {
      events = [...events, ...nextEvents];
      sessionIndex = buildWorkbenchSessionIndex(nextEvents, sessionIndex);
      activeSessionId =
        appendOptions.activateSessionId ?? lastSessionId(nextEvents) ?? activeSessionId;
      return createSnapshot();
    },
    setPinnedSessionIds: (sessionIds) => {
      pinnedSessionIds = [...new Set(sessionIds)];
      return createSnapshot();
    },
    deleteSession: (sessionId) => {
      events = events.filter((event) => event.sessionId !== sessionId);
      sessionIndex = deleteWorkbenchSessionFromIndex(sessionIndex, sessionId);
      pinnedSessionIds = pinnedSessionIds.filter((id) => id !== sessionId);
      activeSessionId = activeSessionId === sessionId ? undefined : activeSessionId;
      return createSnapshot();
    },
    selectSession: (sessionId) => {
      activeSessionId = sessionId;
      return createSnapshot();
    },
    loadSessionEvents: (sessionId, sessionEvents) => {
      events = [
        ...events.filter((event) => event.sessionId !== sessionId),
        ...sessionEvents
      ];
      sessionIndex = buildWorkbenchSessionIndex(sessionEvents, sessionIndex);
      activeSessionId = sessionId;
      return createSnapshot();
    }
  };
}

export function createWorkbenchSessionStartEvents(
  options: CreateWorkbenchSessionEventsOptions
): readonly WorkbenchEvent[] {
  return [
    {
      type: "session.lifecycle",
      sessionId: options.sessionId,
      lifecycle: "started",
      title: options.title,
      workspacePath: options.workspacePath,
      selection: options.selection,
      at: options.at
    }
  ];
}

export function createWorkbenchSessionResumeEvents(
  options: CreateWorkbenchSessionResumeEventsOptions
): readonly WorkbenchEvent[] {
  return [
    {
      type: "session.lifecycle",
      sessionId: options.sessionId,
      lifecycle: "resumed",
      at: options.at
    },
    {
      type: "session.adapter.linked",
      sessionId: options.sessionId,
      adapterId: options.adapterId,
      externalSessionId: options.externalSessionId,
      resumedFromExternalSessionId:
        options.resumedFromExternalSessionId ?? options.externalSessionId,
      at: options.at
    }
  ];
}

function lastSessionId(events: readonly WorkbenchEvent[]): string | undefined {
  return events[events.length - 1]?.sessionId;
}
