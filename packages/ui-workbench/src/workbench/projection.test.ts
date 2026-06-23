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
          commandPreview: "claude --bare -p --verbose --output-format stream-json",
          promptSummary: "Implement the run attempt ledger",
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
      failureKind: "provider_overloaded"
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
