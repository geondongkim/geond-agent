import { describe, expect, it } from "vitest";

import { ZAI_PRE_SUBSCRIPTION_SAMPLE_EVENTS } from "./fixtures.js";
import { projectWorkbenchEvents } from "./projection.js";
import { createWorkbenchSessionStartEvents } from "./controller.js";

describe("projectWorkbenchEvents", () => {
  it("derives pinned sessions, workspaces, and backend status from replayed state", () => {
    const projection = projectWorkbenchEvents(ZAI_PRE_SUBSCRIPTION_SAMPLE_EVENTS, undefined, {
      pinnedSessionIds: ["eval-task-1"]
    });

    expect(projection.activeSessionId).toBe("eval-task-1");
    expect(projection.pinnedSessions.map((session) => session.id)).toEqual(["eval-task-1"]);
    expect(projection.pinnedSessions[0]).toMatchObject({
      id: "eval-task-1",
      resumable: false
    });
    expect(projection.recentSessions).toEqual([]);
    expect(projection.workspaces).toEqual([
      {
        path: "/workspace/geond-agent",
        label: "geond-agent",
        sessionCount: 1,
        updatedAt: "2026-06-21T00:00:10.000Z"
      }
    ]);
    expect(projection.backendStatuses).toEqual([
      {
        backendAdapterId: "claude-code.external-cli-acp",
        label: "Claude Code external CLI/ACP candidate",
        level: "attention",
        detail: "Z.ai API key missing until paid evaluation starts.",
        relatedSessionId: "eval-task-1"
      }
    ]);
  });

  it("keeps a replayable active-session timeline", () => {
    const projection = projectWorkbenchEvents(ZAI_PRE_SUBSCRIPTION_SAMPLE_EVENTS);

    expect(projection.activeSession?.timeline.map((entry) => entry.kind)).toContain("plan");
    expect(projection.activeSession?.timeline.map((entry) => entry.kind)).toContain("adapter");
    expect(projection.activeSession?.timeline.map((entry) => entry.kind)).toContain("approval");
    expect(projection.activeSession?.timeline.map((entry) => entry.kind)).toContain("usage");
    expect(projection.activeSession?.usageReports[0]?.model).toBe("glm-4.7");
  });

  it("marks completed adapter-linked sessions as resumable", () => {
    const projection = projectWorkbenchEvents([
      ...ZAI_PRE_SUBSCRIPTION_SAMPLE_EVENTS,
      {
        type: "session.lifecycle",
        sessionId: "eval-task-1",
        lifecycle: "completed",
        at: "2026-06-21T00:00:11.000Z"
      }
    ]);

    expect(projection.sessions[0]).toMatchObject({
      id: "eval-task-1",
      lifecycle: "completed",
      resumable: true
    });
  });

  it("can project a selected session without changing event replay order", () => {
    const events = [
      ...createWorkbenchSessionStartEvents({
        sessionId: "session-a",
        title: "Session A",
        at: "2026-06-21T02:00:00.000Z"
      }),
      ...createWorkbenchSessionStartEvents({
        sessionId: "session-b",
        title: "Session B",
        at: "2026-06-21T02:01:00.000Z"
      })
    ];

    const projection = projectWorkbenchEvents(events, undefined, {
      activeSessionId: "session-a"
    });

    expect(projection.activeSessionId).toBe("session-a");
    expect(projection.activeSession?.title).toBe("Session A");
  });
});
