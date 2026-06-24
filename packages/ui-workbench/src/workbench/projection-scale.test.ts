import { describe, expect, it } from "vitest";

import type { WorkbenchEvent } from "./events.js";
import { projectWorkbenchEvents } from "./projection.js";

describe("projectWorkbenchEvents scale fixtures", () => {
  it("replays a large multi-session event stream deterministically enough for bounded UI projections", () => {
    const events = createLargeWorkbenchEventStream({
      eventCount: 10_000,
      sessionCount: 50
    });
    const activeSessionId = "scale-session-49";

    expect(events).toHaveLength(10_000);

    const projection = projectWorkbenchEvents(events, undefined, { activeSessionId });

    expect(projection.sessions).toHaveLength(50);
    expect(projection.workspaces.length).toBeGreaterThan(1);
    expect(projection.activeSession?.id).toBe(activeSessionId);
    expect(projection.activeSession?.timeline.length).toBe(
      events.filter((event) => event.sessionId === activeSessionId).length
    );
    expect(projection.activeSession?.providerRouteHealth[0]).toMatchObject({
      providerRouteId: "zai.anthropic-compatible",
      latestHealth: "healthy",
      latestIssueKind: "route_reached",
      latestAttemptStatus: "succeeded"
    });
  });
});

function createLargeWorkbenchEventStream({
  eventCount,
  sessionCount
}: {
  readonly eventCount: number;
  readonly sessionCount: number;
}): readonly WorkbenchEvent[] {
  const events: WorkbenchEvent[] = [];
  for (let index = 0; index < sessionCount; index += 1) {
    const sessionId = `scale-session-${index}`;
    const workspacePath = `/workspace/project-${index % 5}`;
    events.push({
      type: "session.lifecycle",
      sessionId,
      lifecycle: "started",
      title: `Scale session ${index}`,
      workspacePath,
      at: createIso(index)
    });
    events.push({
      type: "run.attempt.started",
      sessionId,
      attempt: {
        id: `attempt-${index}`,
        mode: "claude-live",
        status: "running",
        backendAdapterId: "claude-code.external-cli-acp",
        providerRouteId: "zai.anthropic-compatible",
        modelProfileId: "glm-5.2",
        routingMode: "manual",
        startedAt: createIso(index)
      },
      at: createIso(index)
    });
  }

  const deltaEventCount = Math.max(eventCount - sessionCount * 4, 0);
  for (let index = 0; index < deltaEventCount; index += 1) {
    const sessionIndex = index % sessionCount;
    events.push({
      type: "assistant.text.delta",
      sessionId: `scale-session-${sessionIndex}`,
      messageId: `message-${sessionIndex}`,
      text: `delta ${index}`,
      at: createIso(sessionCount * 2 + index)
    });
  }

  for (let index = 0; index < sessionCount; index += 1) {
    const sessionId = `scale-session-${index}`;
    events.push({
      type: "run.attempt.updated",
      sessionId,
      attemptId: `attempt-${index}`,
      status: "succeeded",
      eventCount,
      finishedAt: createIso(eventCount + index),
      at: createIso(eventCount + index)
    });
    events.push({
      type: "session.lifecycle",
      sessionId,
      lifecycle: "completed",
      at: createIso(eventCount + sessionCount + index)
    });
  }

  return events;
}

function createIso(index: number): string {
  return new Date(Date.UTC(2026, 5, 24, 0, 0, index)).toISOString();
}
