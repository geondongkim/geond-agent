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

  it("projects run attempt events into a replayable attempt ledger", () => {
    const projection = projectWorkbenchEvents([
      ...createWorkbenchSessionStartEvents({
        sessionId: "session-run",
        title: "Run attempt session",
        at: "2026-06-21T02:00:00.000Z"
      }),
      {
        type: "run.attempt.started",
        sessionId: "session-run",
        attempt: {
          id: "attempt-1",
          mode: "claude-live",
          status: "running",
          backendAdapterId: "claude-code.external-cli-acp",
          providerRouteId: "zai.anthropic-compatible",
          modelProfileId: "opus",
          routingMode: "manual",
          externalSessionId: "claude-session-1",
          resumedFromExternalSessionId: "claude-session-1",
          parentRunAttemptId: "attempt-parent",
          followUpReason: "approval_follow_up",
          commandPreview: "claude --bare -p --verbose --output-format stream-json",
          promptSummary: "Implement the run attempt ledger",
          trigger: "approval_follow_up",
          sourceApprovalId: "approval-1",
          startedAt: "2026-06-21T02:00:01.000Z"
        },
        at: "2026-06-21T02:00:01.000Z"
      },
      {
        type: "run.attempt.updated",
        sessionId: "session-run",
        attemptId: "attempt-1",
        status: "failed",
        eventCount: 12,
        ignoredRecordCount: 1,
        parseWarningCount: 0,
        exitCode: 1,
        errorMessage: "HTTP 529 overloaded",
        failureKind: "provider_overloaded",
        finishedAt: "2026-06-21T02:00:05.000Z",
        at: "2026-06-21T02:00:05.000Z"
      },
      {
        type: "runner.issue.detected",
        sessionId: "session-run",
        issue: {
          id: "issue-attempt-0-provider_timeout",
          kind: "provider_timeout",
          severity: "error",
          title: "Provider timeout",
          message: "Z.ai route timed out before returning a stream.",
          retryable: true,
          suggestedAction: "retry_later",
          backendAdapterId: "claude-code.external-cli-acp",
          providerRouteId: "zai.anthropic-compatible",
          modelProfileId: "sonnet",
          attemptId: "attempt-0",
          routeHealth: "unavailable",
          detectedAt: "2026-06-21T02:00:04.000Z"
        },
        at: "2026-06-21T02:00:04.000Z"
      },
      {
        type: "runner.issue.detected",
        sessionId: "session-run",
        issue: {
          id: "issue-attempt-1-provider_overloaded",
          kind: "provider_overloaded",
          severity: "error",
          title: "Provider route overloaded",
          message: "Z.ai route returned HTTP 529. Try again later.",
          retryable: true,
          suggestedAction: "retry_later",
          backendAdapterId: "claude-code.external-cli-acp",
          providerRouteId: "zai.anthropic-compatible",
          modelProfileId: "opus",
          attemptId: "attempt-1",
          routeHealth: "degraded",
          detectedAt: "2026-06-21T02:00:05.000Z"
        },
        at: "2026-06-21T02:00:05.000Z"
      }
    ]);

    expect(projection.activeSession?.runAttempts).toHaveLength(1);
    expect(projection.activeSession?.runAttempts[0]).toMatchObject({
      id: "attempt-1",
      status: "failed",
      eventCount: 12,
      ignoredRecordCount: 1,
      parseWarningCount: 0,
      failureKind: "provider_overloaded",
      trigger: "approval_follow_up",
      parentRunAttemptId: "attempt-parent",
      followUpReason: "approval_follow_up",
      sourceApprovalId: "approval-1"
    });
    expect(projection.activeSession?.liveRunContinuity).toMatchObject({
      latestAttemptId: "attempt-1",
      latestAttemptStatus: "failed",
      latestExternalSessionId: "claude-session-1",
      latestStreamQuality: "failed",
      totalAttemptCount: 1,
      resumeAttemptCount: 1,
      approvalFollowUpAttemptCount: 1,
      cleanStreamAttemptCount: 0,
      warningStreamAttemptCount: 0
    });
    expect(projection.activeSession?.liveRunGuidance).toMatchObject({
      kind: "retry_later",
      severity: "error",
      canResume: true,
      latestAttemptId: "attempt-1",
      latestIssueKind: "provider_overloaded",
      suggestedAction: "retry_later",
      routeHealth: "degraded",
      streamQuality: "failed",
      nextActions: ["retry_later", "resume_session", "inspect_terminal"]
    });
    expect(projection.activeSession?.runnerIssues[0]).toMatchObject({
      id: "issue-attempt-1-provider_overloaded",
      kind: "provider_overloaded",
      routeHealth: "degraded"
    });
    expect(projection.activeSession?.providerRouteHealth[0]).toMatchObject({
      providerRouteId: "zai.anthropic-compatible",
      latestHealth: "degraded",
      latestIssueKind: "provider_overloaded",
      issueCount: 2,
      successfulAttemptCount: 0,
      retryableIssueCount: 2,
      modelProfileIds: ["opus", "sonnet"],
      suggestedActions: ["retry_later"]
    });
    expect(projection.activeSession?.timeline.map((entry) => entry.kind)).toContain("run");
    expect(projection.activeSession?.timeline.map((entry) => entry.kind)).toContain("issue");
    expect(projection.activeSession?.timeline.at(-1)).toMatchObject({
      kind: "issue",
      status: "provider_overloaded"
    });
  });

  it("derives live run guidance for healthy and warning streams", () => {
    const healthyProjection = projectWorkbenchEvents([
      ...createWorkbenchSessionStartEvents({
        sessionId: "session-healthy",
        title: "Healthy session",
        at: "2026-06-21T03:00:00.000Z"
      }),
      {
        type: "run.attempt.started",
        sessionId: "session-healthy",
        attempt: {
          id: "attempt-clean",
          mode: "claude-live",
          status: "running",
          providerRouteId: "zai.anthropic-compatible",
          modelProfileId: "opus",
          externalSessionId: "claude-session-clean",
          startedAt: "2026-06-21T03:00:01.000Z"
        },
        at: "2026-06-21T03:00:01.000Z"
      },
      {
        type: "run.attempt.updated",
        sessionId: "session-healthy",
        attemptId: "attempt-clean",
        status: "succeeded",
        eventCount: 8,
        ignoredRecordCount: 0,
        parseWarningCount: 0,
        finishedAt: "2026-06-21T03:00:05.000Z",
        at: "2026-06-21T03:00:05.000Z"
      }
    ]);
    const warningProjection = projectWorkbenchEvents([
      ...createWorkbenchSessionStartEvents({
        sessionId: "session-warning",
        title: "Warning session",
        at: "2026-06-21T04:00:00.000Z"
      }),
      {
        type: "run.attempt.started",
        sessionId: "session-warning",
        attempt: {
          id: "attempt-warning",
          mode: "claude-live",
          status: "running",
          externalSessionId: "claude-session-warning",
          startedAt: "2026-06-21T04:00:01.000Z"
        },
        at: "2026-06-21T04:00:01.000Z"
      },
      {
        type: "run.attempt.updated",
        sessionId: "session-warning",
        attemptId: "attempt-warning",
        status: "succeeded",
        eventCount: 8,
        ignoredRecordCount: 1,
        parseWarningCount: 1,
        finishedAt: "2026-06-21T04:00:05.000Z",
        at: "2026-06-21T04:00:05.000Z"
      }
    ]);

    expect(healthyProjection.activeSession?.liveRunGuidance).toMatchObject({
      kind: "healthy",
      severity: "success",
      streamQuality: "clean",
      nextActions: ["review_evidence"]
    });
    expect(healthyProjection.activeSession?.providerRouteHealth[0]).toMatchObject({
      providerRouteId: "zai.anthropic-compatible",
      latestHealth: "healthy",
      latestIssueKind: "route_reached",
      latestAttemptStatus: "succeeded",
      issueCount: 0,
      successfulAttemptCount: 1,
      retryableIssueCount: 0,
      modelProfileIds: ["opus"]
    });
    expect(warningProjection.activeSession?.liveRunGuidance).toMatchObject({
      kind: "stream_warning",
      severity: "warning",
      streamQuality: "warning",
      nextActions: ["inspect_terminal", "queue_recovery_brief"]
    });
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

describe("chat transcript projection", () => {
  it("groups events into user/assistant turns and consolidates deltas", () => {
    const events = [
      ...createWorkbenchSessionStartEvents({
        sessionId: "chat-1",
        title: "Chat",
        workspacePath: "/workspace",
        at: "2026-07-01T00:00:00.000Z"
      }),
      {
        type: "user.message" as const,
        sessionId: "chat-1",
        messageId: "u1",
        text: "Hello there",
        at: "2026-07-01T00:00:01.000Z"
      },
      {
        type: "assistant.text.delta" as const,
        sessionId: "chat-1",
        messageId: "m1",
        text: "Hi ",
        at: "2026-07-01T00:00:02.000Z"
      },
      {
        type: "assistant.text.delta" as const,
        sessionId: "chat-1",
        messageId: "m1",
        text: "there!",
        at: "2026-07-01T00:00:03.000Z"
      },
      {
        type: "tool.call.started" as const,
        sessionId: "chat-1",
        toolCall: { id: "t1", name: "Read", status: "succeeded" as const, inputSummary: "file.ts" },
        at: "2026-07-01T00:00:04.000Z"
      },
      {
        type: "assistant.text.completed" as const,
        sessionId: "chat-1",
        messageId: "m1",
        text: "Hi there!",
        at: "2026-07-01T00:00:05.000Z"
      }
    ];

    const projection = projectWorkbenchEvents(events, undefined, { activeSessionId: "chat-1" });
    const turns = projection.activeSession?.messages ?? [];

    expect(turns.map((turn) => turn.kind)).toEqual(["user", "assistant"]);
    expect(turns[0]).toMatchObject({ kind: "user", text: "Hello there" });
    const assistant = turns.find((turn) => turn.kind === "assistant");
    if (!assistant || assistant.kind !== "assistant") {
      throw new Error("expected assistant turn");
    }
    const message = assistant.messages[0];
    if (!message) {
      throw new Error("expected assistant message");
    }
    // deltas consolidated into a single finalized message (no per-delta cards)
    expect(assistant.messages).toHaveLength(1);
    expect(message.text).toBe("Hi there!");
    expect(message.streaming).toBe(false);
    expect(assistant.activity.map((entry) => entry.kind)).toEqual(["tool"]);
    expect(assistant.streaming).toBe(false);
  });

  it("marks an assistant message streaming until a completed event arrives", () => {
    const events = [
      ...createWorkbenchSessionStartEvents({
        sessionId: "chat-2",
        title: "Chat",
        workspacePath: "/workspace",
        at: "2026-07-01T00:00:00.000Z"
      }),
      {
        type: "user.message" as const,
        sessionId: "chat-2",
        text: "ping",
        at: "2026-07-01T00:00:01.000Z"
      },
      {
        type: "assistant.text.delta" as const,
        sessionId: "chat-2",
        messageId: "m1",
        text: "po",
        at: "2026-07-01T00:00:02.000Z"
      }
    ];

    const projection = projectWorkbenchEvents(events, undefined, { activeSessionId: "chat-2" });
    const turns = projection.activeSession?.messages ?? [];
    const assistant = turns.find((turn) => turn.kind === "assistant");
    if (!assistant || assistant.kind !== "assistant") {
      throw new Error("expected assistant turn");
    }
    const message = assistant.messages[0];
    if (!message) {
      throw new Error("expected assistant message");
    }
    expect(message.text).toBe("po");
    expect(message.streaming).toBe(true);
    expect(assistant.streaming).toBe(true);
  });
});
