import type { WorkbenchEvent } from "./events.js";
import {
  projectWorkbenchEvents,
  type WorkbenchProjection,
  type WorkbenchProjectionOptions
} from "./projection.js";
import type { WorkbenchSelectionSnapshot } from "./selection.js";

export interface WorkbenchSessionControllerSnapshot {
  readonly events: readonly WorkbenchEvent[];
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
}

export interface WorkbenchSessionControllerOptions {
  readonly initialEvents?: readonly WorkbenchEvent[];
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

export function createWorkbenchSessionController(
  options: WorkbenchSessionControllerOptions = {}
): WorkbenchSessionController {
  let events = [...(options.initialEvents ?? [])];
  let activeSessionId = options.activeSessionId;
  let pinnedSessionIds = [...(options.pinnedSessionIds ?? [])];

  const createSnapshot = (): WorkbenchSessionControllerSnapshot => {
    const projectionOptions: WorkbenchProjectionOptions = {
      pinnedSessionIds,
      activeSessionId
    };
    const projection = projectWorkbenchEvents(events, undefined, projectionOptions);

    activeSessionId = projection.activeSessionId;

    return {
      events,
      projection,
      activeSessionId
    };
  };

  return {
    getSnapshot: createSnapshot,
    appendEvents: (nextEvents, appendOptions = {}) => {
      events = [...events, ...nextEvents];
      activeSessionId = appendOptions.activateSessionId ?? lastSessionId(nextEvents) ?? activeSessionId;
      return createSnapshot();
    },
    setPinnedSessionIds: (sessionIds) => {
      pinnedSessionIds = [...new Set(sessionIds)];
      return createSnapshot();
    },
    deleteSession: (sessionId) => {
      events = events.filter((event) => event.sessionId !== sessionId);
      pinnedSessionIds = pinnedSessionIds.filter((id) => id !== sessionId);
      activeSessionId = activeSessionId === sessionId ? undefined : activeSessionId;
      return createSnapshot();
    },
    selectSession: (sessionId) => {
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

function lastSessionId(events: readonly WorkbenchEvent[]): string | undefined {
  return events[events.length - 1]?.sessionId;
}
