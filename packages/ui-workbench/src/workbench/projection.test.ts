import { describe, expect, it } from "vitest";

import { ZAI_PRE_SUBSCRIPTION_SAMPLE_EVENTS } from "./fixtures.js";
import { projectWorkbenchEvents } from "./projection.js";

describe("projectWorkbenchEvents", () => {
  it("derives pinned sessions, workspaces, and backend status from replayed state", () => {
    const projection = projectWorkbenchEvents(ZAI_PRE_SUBSCRIPTION_SAMPLE_EVENTS, undefined, {
      pinnedSessionIds: ["eval-task-1"]
    });

    expect(projection.activeSessionId).toBe("eval-task-1");
    expect(projection.pinnedSessions.map((session) => session.id)).toEqual(["eval-task-1"]);
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
    expect(projection.activeSession?.timeline.map((entry) => entry.kind)).toContain("approval");
  });
});
