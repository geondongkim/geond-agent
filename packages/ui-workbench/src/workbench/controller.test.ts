import { describe, expect, it } from "vitest";

import {
  createWorkbenchSessionController,
  createWorkbenchSessionStartEvents
} from "./controller.js";
import type { WorkbenchEvent } from "./events.js";
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

  it("can update pinned sessions without rewriting the event stream", () => {
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

    const pinned = controller.setPinnedSessionIds(["session-a"]);

    expect(pinned.projection.pinnedSessions.map((session) => session.id)).toEqual(["session-a"]);
    expect(pinned.projection.recentSessions.map((session) => session.id)).toEqual(["session-b"]);
    expect(pinned.events).toHaveLength(2);
  });

  it("can delete a session from the replay stream and pinned projection", () => {
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
      ],
      pinnedSessionIds: ["session-a", "session-b"],
      activeSessionId: "session-b"
    });

    const deleted = controller.deleteSession("session-b");

    expect(deleted.activeSessionId).toBe("session-a");
    expect(deleted.events.map((event) => event.sessionId)).toEqual(["session-a"]);
    expect(deleted.projection.sessions.map((session) => session.id)).toEqual(["session-a"]);
    expect(deleted.projection.pinnedSessions.map((session) => session.id)).toEqual(["session-a"]);
  });

  it("tracks approval requests and resolutions through replayed projection state", () => {
    const controller = createWorkbenchSessionController();
    const sessionEvents = createWorkbenchSessionStartEvents({
      sessionId: "session-approval",
      title: "Approval session",
      at: "2026-06-21T02:00:00.000Z"
    });
    const approvalRequested: WorkbenchEvent = {
      type: "approval.requested",
      sessionId: "session-approval",
      approval: {
        id: "approval-run-verify",
        kind: "command",
        title: "Run pnpm verify",
        status: "pending",
        subject: "pnpm verify"
      },
      at: "2026-06-21T02:01:00.000Z"
    };

    const pending = controller.appendEvents([...sessionEvents, approvalRequested], {
      activateSessionId: "session-approval"
    });

    expect(pending.projection.activeSession?.approvals[0]).toMatchObject({
      id: "approval-run-verify",
      status: "pending"
    });
    expect(pending.projection.activeSession?.timeline.map((entry) => entry.kind)).toContain(
      "approval"
    );
    expect(pending.projection.sessions[0]?.pendingApprovalCount).toBe(1);

    const resolved = controller.appendEvents(
      [
        {
          type: "approval.resolved",
          sessionId: "session-approval",
          approvalId: "approval-run-verify",
          decision: "approved",
          at: "2026-06-21T02:02:00.000Z"
        }
      ],
      { activateSessionId: "session-approval" }
    );

    expect(resolved.projection.activeSession?.approvals[0]).toMatchObject({
      id: "approval-run-verify",
      status: "resolved",
      decision: "approved"
    });
    expect(resolved.projection.sessions[0]?.pendingApprovalCount).toBe(0);
    expect(resolved.events).toHaveLength(3);
  });
});
