import { describe, expect, it } from "vitest";

import type { WorkbenchEvent } from "./events.js";
import { workbenchEventIdentity } from "./event-identity.js";

describe("workbenchEventIdentity", () => {
  it("uses stable structural keys for semantically identical usage events", () => {
    const left: WorkbenchEvent = {
      type: "usage.reported",
      sessionId: "session-1",
      usage: {
        id: "usage-1",
        source: "provider",
        model: "glm-5.2",
        inputTokens: 100
      }
    };
    const right: WorkbenchEvent = {
      sessionId: "session-1",
      type: "usage.reported",
      usage: {
        inputTokens: 100,
        model: "glm-5.2",
        source: "provider",
        id: "usage-1"
      }
    };

    expect(workbenchEventIdentity(left)).toBe(workbenchEventIdentity(right));
  });

  it("keeps command output chunks distinct when text changes", () => {
    const first: WorkbenchEvent = {
      type: "command.output",
      sessionId: "session-1",
      commandId: "cmd-1",
      stream: "stdout",
      text: "first"
    };
    const second: WorkbenchEvent = {
      ...first,
      text: "second"
    };

    expect(workbenchEventIdentity(first)).not.toBe(workbenchEventIdentity(second));
  });

  it("keeps assistant deltas distinct when token text changes", () => {
    const first: WorkbenchEvent = {
      type: "assistant.text.delta",
      sessionId: "session-1",
      messageId: "message-1",
      text: "hello"
    };
    const second: WorkbenchEvent = {
      ...first,
      text: " world"
    };

    expect(workbenchEventIdentity(first)).not.toBe(workbenchEventIdentity(second));
  });

  it("deduplicates tool updates by tool id, status, and timestamp", () => {
    const first: WorkbenchEvent = {
      type: "tool.call.updated",
      sessionId: "session-1",
      toolCallId: "tool-1",
      status: "succeeded",
      at: "2026-06-22T00:00:00.000Z"
    };
    const second: WorkbenchEvent = {
      ...first
    };

    expect(workbenchEventIdentity(first)).toBe(workbenchEventIdentity(second));
  });

  it("distinguishes adapter links by external session id", () => {
    const first: WorkbenchEvent = {
      type: "session.adapter.linked",
      sessionId: "session-1",
      adapterId: "claude-code.external-cli-acp",
      externalSessionId: "claude-session-a"
    };
    const second: WorkbenchEvent = {
      ...first,
      externalSessionId: "claude-session-b"
    };

    expect(workbenchEventIdentity(first)).not.toBe(workbenchEventIdentity(second));
  });

  it("distinguishes context attachments by attachment id and referenced path", () => {
    const first: WorkbenchEvent = {
      type: "context.attached",
      sessionId: "session-1",
      attachment: {
        id: "context-1",
        kind: "file",
        title: "architecture.md",
        provenance: "desktop",
        contentState: "metadata-only",
        path: "docs/architecture.md"
      }
    };
    const second: WorkbenchEvent = {
      ...first,
      attachment: {
        ...first.attachment,
        path: "docs/roadmap.md"
      }
    };

    expect(workbenchEventIdentity(first)).not.toBe(workbenchEventIdentity(second));
  });

  it("deduplicates run attempt updates by attempt, status, timestamp, and summary", () => {
    const first: WorkbenchEvent = {
      type: "run.attempt.updated",
      sessionId: "session-1",
      attemptId: "attempt-1",
      status: "succeeded",
      eventCount: 12,
      ignoredRecordCount: 1,
      parseWarningCount: 0,
      exitCode: 0,
      at: "2026-06-22T00:00:00.000Z"
    };
    const second: WorkbenchEvent = {
      ...first
    };
    const failed: WorkbenchEvent = {
      ...first,
      status: "failed",
      errorMessage: "runner failed"
    };
    const overloaded: WorkbenchEvent = {
      ...failed,
      failureKind: "provider_overloaded"
    };

    expect(workbenchEventIdentity(first)).toBe(workbenchEventIdentity(second));
    expect(workbenchEventIdentity(first)).not.toBe(workbenchEventIdentity(failed));
    expect(workbenchEventIdentity(failed)).not.toBe(workbenchEventIdentity(overloaded));
  });

  it("deduplicates runner issue events by route, model, issue, and message", () => {
    const first: WorkbenchEvent = {
      type: "runner.issue.detected",
      sessionId: "session-1",
      issue: {
        id: "issue-attempt-1-provider_overloaded",
        kind: "provider_overloaded",
        severity: "error",
        title: "Provider route overloaded",
        message: "Route returned HTTP 529.",
        retryable: true,
        suggestedAction: "retry_later",
        backendAdapterId: "claude-code.external-cli-acp",
        providerRouteId: "zai.anthropic-compatible",
        modelProfileId: "opus",
        attemptId: "attempt-1",
        routeHealth: "degraded"
      },
      at: "2026-06-22T00:00:00.000Z"
    };
    const same: WorkbenchEvent = {
      ...first
    };
    const differentRoute: WorkbenchEvent = {
      ...first,
      issue: {
        ...first.issue,
        providerRouteId: "zai.openai-compatible"
      }
    };

    expect(workbenchEventIdentity(first)).toBe(workbenchEventIdentity(same));
    expect(workbenchEventIdentity(first)).not.toBe(workbenchEventIdentity(differentRoute));
  });
});
