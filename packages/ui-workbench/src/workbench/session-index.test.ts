import { describe, expect, it } from "vitest";

import {
  createWorkbenchSessionController,
  createWorkbenchSessionResumeEvents
} from "./controller.js";
import { ZAI_PRE_SUBSCRIPTION_SAMPLE_EVENTS } from "./fixtures.js";
import { projectWorkbenchEvents, projectWorkbenchSessionIndex } from "./projection.js";
import {
  buildWorkbenchSessionIndex,
  createWorkbenchSessionIndexFromEntries,
  listWorkbenchSessionIndexEntries
} from "./session-index.js";
import type { WorkbenchEvent } from "./events.js";

describe("workbench session index", () => {
  it("projects the same session list as full event replay", () => {
    const index = buildWorkbenchSessionIndex(ZAI_PRE_SUBSCRIPTION_SAMPLE_EVENTS);
    const fullProjection = projectWorkbenchEvents(ZAI_PRE_SUBSCRIPTION_SAMPLE_EVENTS);
    const indexProjection = projectWorkbenchSessionIndex(
      index,
      ZAI_PRE_SUBSCRIPTION_SAMPLE_EVENTS
    );

    expect(indexProjection.sessions).toEqual(fullProjection.sessions);
    expect(indexProjection.workspaces).toEqual(fullProjection.workspaces);
    expect(indexProjection.backendStatuses).toEqual(fullProjection.backendStatuses);
    expect(indexProjection.activeSession?.timeline).toEqual(
      fullProjection.activeSession?.timeline
    );
  });

  it("keeps resumable session metadata without loading that session's events", () => {
    const events: readonly WorkbenchEvent[] = [
      ...ZAI_PRE_SUBSCRIPTION_SAMPLE_EVENTS,
      ...createWorkbenchSessionResumeEvents({
        sessionId: "eval-task-1",
        adapterId: "claude-code.external-cli-acp",
        externalSessionId: "external-claude-session",
        at: "2026-06-21T00:00:11.000Z"
      }),
      {
        type: "session.lifecycle",
        sessionId: "eval-task-1",
        lifecycle: "completed",
        at: "2026-06-21T00:00:12.000Z"
      }
    ];
    const entries = listWorkbenchSessionIndexEntries(buildWorkbenchSessionIndex(events));
    const controller = createWorkbenchSessionController({
      initialEvents: [],
      initialSessionIndex: createWorkbenchSessionIndexFromEntries(entries),
      activeSessionId: "eval-task-1"
    });
    const snapshot = controller.getSnapshot();

    expect(snapshot.projection.sessions[0]).toMatchObject({
      id: "eval-task-1",
      lifecycle: "completed",
      resumable: true
    });
    expect(snapshot.projection.activeSession).toBeUndefined();
  });

  it("loads one selected session's events into the active projection", () => {
    const index = buildWorkbenchSessionIndex(ZAI_PRE_SUBSCRIPTION_SAMPLE_EVENTS);
    const controller = createWorkbenchSessionController({
      initialSessionIndex: index
    });

    const snapshot = controller.loadSessionEvents(
      "eval-task-1",
      ZAI_PRE_SUBSCRIPTION_SAMPLE_EVENTS
    );

    expect(snapshot.activeSessionId).toBe("eval-task-1");
    expect(snapshot.projection.activeSession?.timeline.map((entry) => entry.kind)).toContain(
      "approval"
    );
    expect(snapshot.events).toHaveLength(ZAI_PRE_SUBSCRIPTION_SAMPLE_EVENTS.length);
  });
});
