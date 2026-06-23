import { describe, expect, it } from "vitest";

import { createUiI18n } from "@geond-agent/ui-workbench";

import {
  createLiveRunCancelledEvents,
  createLiveRunCompletionEvents,
  createLiveRunFailureEvents,
  createLiveRunPreludeEvents,
  createLiveRunReadinessBlockedEvents,
  createRunnerIssueDetectedEvent,
  createRunAttemptStartedEvent,
  createRunAttemptUpdatedEvent
} from "./live-run-events.js";
import { createDesktopWorkbenchCatalog } from "../lib/workbench-catalog.js";
import type { RunnerRequest, RunnerResult } from "./types.js";

describe("desktop live run event factories", () => {
  it("creates a fresh Claude Code prelude with selection and command preview events", () => {
    const events = createLiveRunPreludeEvents(
      createRunnerRequest(),
      "Fresh run",
      createUiI18n("en"),
      false,
      createDesktopWorkbenchCatalog()
    );

    expect(events.map((event) => event.type)).toEqual([
      "session.lifecycle",
      "plan.updated",
      "command.output",
      "warning"
    ]);
    expect(events[0]).toMatchObject({
      type: "session.lifecycle",
      sessionId: "workbench-session-1",
      lifecycle: "started",
      selection: {
        backendAdapterId: "claude-code.external-cli-acp",
        modelProfileId: "opus"
      }
    });
  });

  it("creates a resume prelude that links the external Claude Code session", () => {
    const events = createLiveRunPreludeEvents(
      createRunnerRequest({ externalSessionId: "claude-session-1" }),
      "Resume run",
      createUiI18n("en"),
      true,
      createDesktopWorkbenchCatalog()
    );

    expect(events.map((event) => event.type).slice(0, 3)).toEqual([
      "session.lifecycle",
      "session.adapter.linked",
      "selection.snapshot.updated"
    ]);
    expect(events[1]).toMatchObject({
      type: "session.adapter.linked",
      externalSessionId: "claude-session-1"
    });
  });

  it("summarizes completion, failure, and cancel states as normalized workbench events", () => {
    expect(
      createLiveRunCompletionEvents("workbench-session-1", createRunnerResult({ exitCode: 0 }))[1]
    ).toMatchObject({ type: "session.lifecycle", lifecycle: "completed" });
    expect(
      createLiveRunCompletionEvents("workbench-session-1", createRunnerResult({ exitCode: 2 }))[1]
    ).toMatchObject({ type: "session.lifecycle", lifecycle: "failed" });
    expect(createLiveRunFailureEvents("workbench-session-1", "boom").map((event) => event.type)).toEqual([
      "command.output",
      "error",
      "session.lifecycle"
    ]);
    expect(
      createLiveRunReadinessBlockedEvents("workbench-session-1", "route blocked")[1]
    ).toMatchObject({
      type: "error",
      id: "claude-code-live-runner-readiness-blocked",
      message: "route blocked"
    });
    expect(createLiveRunCancelledEvents("workbench-session-1", createUiI18n("en"), true)[0]).toMatchObject({
      type: "command.output",
      status: "interrupted"
    });
  });

  it("creates redacted run attempt ledger events for live Claude runs", () => {
    const secretEnvName = ["ZAI", "API", "KEY"].join("_");
    const token = ["sk", "d".repeat(28)].join("-");
    const started = createRunAttemptStartedEvent(
      createRunnerRequest({
        prompt: `Implement the slice with ${secretEnvName}=${token}`,
        externalSessionId: "claude-session-1"
      }),
      "claude-live",
      "attempt-1",
      true,
      {
        trigger: "approval_follow_up",
        sourceApprovalId: "approval-1"
      }
    );
    const updated = createRunAttemptUpdatedEvent("workbench-session-1", "attempt-1", "failed", {
      exitCode: 1,
      eventCount: 4,
      ignoredRecordCount: 1,
      parseWarningCount: 2,
      errorMessage: `stderr echoed ${secretEnvName}=${token}`,
      failureKind: "provider_overloaded"
    });
    const issue = createRunnerIssueDetectedEvent("workbench-session-1", {
      id: "issue-attempt-1-provider_overloaded",
      kind: "provider_overloaded",
      severity: "error",
      title: "Provider route overloaded",
      message: `route failed with ${secretEnvName}=${token}`,
      retryable: true,
      suggestedAction: "retry_later",
      backendAdapterId: "claude-code.external-cli-acp",
      providerRouteId: "zai.anthropic-compatible",
      modelProfileId: "opus",
      attemptId: "attempt-1",
      routeHealth: "degraded",
      detectedAt: "2026-06-23T00:00:00.000Z"
    });

    expect(started).toMatchObject({
      type: "run.attempt.started",
      sessionId: "workbench-session-1",
      attempt: {
        id: "attempt-1",
        mode: "claude-live",
        status: "running",
        resumedFromExternalSessionId: "claude-session-1",
        trigger: "approval_follow_up",
        sourceApprovalId: "approval-1"
      }
    });
    expect(started.type === "run.attempt.started" ? started.attempt.promptSummary : "").toBe(
      `Implement the slice with ${secretEnvName}=[redacted]`
    );
    expect(updated).toMatchObject({
      type: "run.attempt.updated",
      sessionId: "workbench-session-1",
      attemptId: "attempt-1",
      status: "failed",
      eventCount: 4,
      ignoredRecordCount: 1,
      parseWarningCount: 2,
      exitCode: 1,
      failureKind: "provider_overloaded"
    });
    expect(updated.type === "run.attempt.updated" ? updated.errorMessage : "").toBe(
      `${"stderr echoed"} ${secretEnvName}=[redacted]`
    );
    expect(issue).toMatchObject({
      type: "runner.issue.detected",
      issue: {
        kind: "provider_overloaded",
        message: `route failed with ${secretEnvName}=[redacted]`
      }
    });
    expect(
      createLiveRunFailureEvents("workbench-session-1", `${secretEnvName}=${token}`)[0]
    ).toMatchObject({
      type: "command.output",
      text: `${secretEnvName}=[redacted]`
    });
    expect(JSON.stringify([started, updated, issue])).not.toContain(token);
  });
});

function createRunnerRequest(overrides: Partial<RunnerRequest> = {}): RunnerRequest {
  return {
    sessionId: "workbench-session-1",
    title: "Workbench session",
    prompt: "Inspect the workspace.",
    workspacePath: "/workspace/geond-agent",
    modelAlias: "opus",
    providerRouteId: "zai.anthropic-compatible",
    modelProfileId: "opus",
    backendAdapterId: "claude-code.external-cli-acp",
    routingMode: "manual",
    uiLanguage: "en",
    agentResponseLanguage: "system",
    ...overrides
  };
}

function createRunnerResult(overrides: Partial<RunnerResult> = {}): RunnerResult {
  return {
    command: {
      executable: "claude",
      args: ["--bare", "-p", "--verbose", "--output-format", "stream-json"],
      streamChannelId: "workbench-session-1"
    },
    events: [],
    ignoredRecords: [],
    parseErrors: [],
    exitCode: 0,
    ...overrides
  };
}
