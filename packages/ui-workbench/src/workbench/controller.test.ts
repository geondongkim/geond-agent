import { describe, expect, it } from "vitest";

import {
  createWorkbenchSessionController,
  createWorkbenchSessionResumeEvents,
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

  it("tracks metadata-only context attachments through replayed projection state", () => {
    const controller = createWorkbenchSessionController();
    const sessionEvents = createWorkbenchSessionStartEvents({
      sessionId: "session-context",
      title: "Context session",
      workspacePath: "/workspace/geond-agent",
      at: "2026-06-21T02:00:00.000Z"
    });
    const contextAttached: WorkbenchEvent = {
      type: "context.attached",
      sessionId: "session-context",
      attachment: {
        id: "context-file-architecture",
        kind: "file",
        title: "architecture.md",
        provenance: "ide-plugin",
        contentState: "metadata-only",
        path: "docs/architecture.md",
        language: "markdown",
        range: {
          startLine: 1,
          endLine: 12
        },
        summary: "Current file attached by an IDE surface without raw content."
      },
      at: "2026-06-21T02:01:00.000Z"
    };

    const snapshot = controller.appendEvents([...sessionEvents, contextAttached], {
      activateSessionId: "session-context"
    });

    expect(snapshot.projection.activeSession?.contextAttachments[0]).toMatchObject({
      id: "context-file-architecture",
      contentState: "metadata-only",
      provenance: "ide-plugin",
      path: "docs/architecture.md"
    });
    expect(snapshot.projection.activeSession?.timeline.map((entry) => entry.kind)).toContain(
      "context"
    );
  });

  it("tracks metadata-only artifacts and reasoning usage through replayed projection state", () => {
    const controller = createWorkbenchSessionController();
    const sessionEvents = createWorkbenchSessionStartEvents({
      sessionId: "session-artifact",
      title: "Artifact session",
      at: "2026-06-21T02:00:00.000Z"
    });
    const events: readonly WorkbenchEvent[] = [
      ...sessionEvents,
      {
        type: "usage.reported",
        sessionId: "session-artifact",
        usage: {
          id: "usage-1",
          source: "model",
          model: "glm-5.2",
          inputTokens: 1000,
          outputTokens: 200,
          thinkingTokens: 75,
          reasoningTokens: 40
        },
        at: "2026-06-21T02:01:00.000Z"
      },
      {
        type: "artifact.emitted",
        sessionId: "session-artifact",
        artifact: {
          id: "artifact-1",
          kind: "structured-trace",
          title: "Structured trace",
          contentState: "metadata-only",
          path: "output/local/session-artifact/trace.json",
          summary: "Path-only reference; payload is stored outside the event stream."
        },
        at: "2026-06-21T02:02:00.000Z"
      }
    ];

    const snapshot = controller.appendEvents(events, {
      activateSessionId: "session-artifact"
    });

    expect(snapshot.projection.activeSession?.usageReports[0]).toMatchObject({
      model: "glm-5.2",
      thinkingTokens: 75,
      reasoningTokens: 40
    });
    expect(snapshot.projection.activeSession?.artifacts[0]).toMatchObject({
      id: "artifact-1",
      contentState: "metadata-only"
    });
    expect(snapshot.projection.activeSession?.timeline.map((entry) => entry.kind)).toContain(
      "artifact"
    );
  });

  it("creates a resumable adapter-linked session prelude", () => {
    const controller = createWorkbenchSessionController({
      initialEvents: createWorkbenchSessionStartEvents({
        sessionId: "session-resume",
        title: "Resume session",
        at: "2026-06-21T02:00:00.000Z"
      })
    });

    const resumed = controller.appendEvents(
      createWorkbenchSessionResumeEvents({
        sessionId: "session-resume",
        adapterId: "claude-code.external-cli-acp",
        externalSessionId: "claude-session-resume",
        at: "2026-06-21T02:10:00.000Z"
      }),
      { activateSessionId: "session-resume" }
    );

    expect(resumed.projection.activeSession?.lifecycle).toBe("resumed");
    expect(resumed.projection.activeSession?.externalSessions).toEqual({
      "claude-code.external-cli-acp": {
        adapterId: "claude-code.external-cli-acp",
        externalSessionId: "claude-session-resume",
        resumedFromExternalSessionId: "claude-session-resume",
        linkedAt: "2026-06-21T02:10:00.000Z"
      }
    });
    expect(resumed.projection.activeSession?.timeline.map((entry) => entry.kind)).toContain(
      "adapter"
    );
  });
});
