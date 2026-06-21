import { describe, expect, it } from "vitest";

import {
  createWorkbenchSessionController,
  createWorkbenchSessionStartEvents
} from "./controller.js";
import { ZAI_PRE_SUBSCRIPTION_SELECTION } from "./fixtures.js";

describe("createWorkbenchSessionController", () => {
  it("appends events and projects the active session through the controller boundary", () => {
    const controller = createWorkbenchSessionController();

    const snapshot = controller.appendEvents(
      createWorkbenchSessionStartEvents({
        sessionId: "local-session-1",
        title: "Local session",
        workspacePath: "/workspace/geond-agent",
        selection: ZAI_PRE_SUBSCRIPTION_SELECTION,
        at: "2026-06-21T02:00:00.000Z"
      }),
      { activateSessionId: "local-session-1" }
    );

    expect(snapshot.activeSessionId).toBe("local-session-1");
    expect(snapshot.projection.activeSession?.title).toBe("Local session");
    expect(snapshot.events).toHaveLength(1);
  });

  it("lets callers select a prior session without mutating the event stream", () => {
    const controller = createWorkbenchSessionController({
      initialEvents: [
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
      ]
    });

    const selected = controller.selectSession("session-a");

    expect(selected.activeSessionId).toBe("session-a");
    expect(selected.projection.activeSession?.title).toBe("Session A");
    expect(selected.events).toHaveLength(2);
  });
});
