import { describe, expect, it } from "vitest";

import { createUiI18n } from "@geond-agent/ui-workbench";

import {
  classifyClaudeLiveRunIssue,
  collectClaudeLiveRunFailureText
} from "./live-run-issues.js";
import type { RunnerRequest, RunnerResult } from "./types.js";

describe("Claude live run issue classification", () => {
  it("classifies Z.ai/Anthropic route overloads as retryable provider incidents", () => {
    const issue = classifyClaudeLiveRunIssue({
      request: createRunnerRequest(),
      attemptId: "attempt-1",
      message: "HTTP 529: Overloaded. The upstream provider is temporarily overloaded.",
      i18n: createUiI18n("en")
    });

    expect(issue).toMatchObject({
      id: "issue-attempt-1-provider_overloaded",
      kind: "provider_overloaded",
      severity: "error",
      retryable: true,
      suggestedAction: "retry_later",
      routeHealth: "degraded",
      backendAdapterId: "claude-code.external-cli-acp",
      providerRouteId: "zai.anthropic-compatible",
      modelProfileId: "opus",
      attemptId: "attempt-1"
    });
  });

  it("classifies auth, quota, and timeout failures into stable failure kinds", () => {
    const cases = [
      ["401 invalid API key", "provider_auth", "check_key", false, "unavailable"],
      ["429 rate limit quota exceeded", "provider_quota", "retry_later", true, "degraded"],
      ["request timed out with ETIMEDOUT", "provider_timeout", "retry_later", true, "unavailable"]
    ] as const;

    cases.forEach(([message, kind, suggestedAction, retryable, routeHealth]) => {
      const issue = classifyClaudeLiveRunIssue({
        request: createRunnerRequest(),
        attemptId: `attempt-${kind}`,
        message,
        i18n: createUiI18n("en")
      });

      expect(issue).toMatchObject({
        kind,
        suggestedAction,
        retryable,
        routeHealth
      });
    });
  });

  it("redacts secret-looking values before classifying failure text", () => {
    const secretEnvName = ["ZAI", "API", "KEY"].join("_");
    const token = ["sk", "x".repeat(28)].join("-");
    const issue = classifyClaudeLiveRunIssue({
      request: createRunnerRequest(),
      attemptId: "attempt-auth",
      message: `401 unauthorized ${secretEnvName}=${token}`,
      i18n: createUiI18n("en")
    });

    expect(issue?.kind).toBe("provider_auth");
    expect(JSON.stringify(issue)).not.toContain(token);
  });

  it("collects failure evidence from normalized stream events and runner stderr", () => {
    const failureText = collectClaudeLiveRunFailureText(
      createRunnerResult({
        events: [
          {
            type: "command.output",
            sessionId: "session-1",
            commandId: "cmd-claude-live",
            stream: "stderr",
            text: "HTTP 529",
            status: "failed"
          },
          {
            type: "error",
            sessionId: "session-1",
            id: "claude-live-runner-error",
            message: "provider overloaded"
          },
          {
            type: "run.attempt.updated",
            sessionId: "session-1",
            attemptId: "attempt-1",
            status: "failed",
            errorMessage: "temporarily overloaded"
          }
        ],
        parseErrors: ["parse warning: overloaded payload"],
        stderrPreview: "stderr preview overloaded"
      })
    );

    expect(failureText).toContain("HTTP 529");
    expect(failureText).toContain("provider overloaded");
    expect(failureText).toContain("temporarily overloaded");
    expect(failureText).toContain("parse warning: overloaded payload");
    expect(failureText).toContain("stderr preview overloaded");
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
    exitCode: 1,
    ...overrides
  };
}
