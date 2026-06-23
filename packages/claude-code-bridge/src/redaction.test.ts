import { describe, expect, it } from "vitest";

import {
  redactSensitiveTextContent,
  redactWorkbenchEventContent
} from "./redaction.js";

describe("Claude Code stream content redaction", () => {
  it("redacts secret-like assignments and token-shaped values", () => {
    const secretEnvName = ["ANTHROPIC", "API", "KEY"].join("_");
    const token = ["sk", "a".repeat(28)].join("-");
    const text = `failed with ${secretEnvName}=${token}`;

    const redacted = redactSensitiveTextContent(text);

    expect(redacted).toContain(`${secretEnvName}=[redacted]`);
    expect(redacted).not.toContain(token);
  });

  it("redacts sensitive workbench event text fields without changing event identity", () => {
    const secretEnvName = ["ZAI", "API", "KEY"].join("_");
    const token = ["sk", "b".repeat(28)].join("-");
    const event = redactWorkbenchEventContent({
      type: "command.output",
      sessionId: "session-redaction",
      commandId: "cmd-live",
      stream: "stderr",
      text: `stderr echoed ${secretEnvName}=${token}`,
      status: "running",
      at: "2026-06-22T00:00:00.000Z"
    });

    expect(event).toMatchObject({
      type: "command.output",
      sessionId: "session-redaction",
      commandId: "cmd-live"
    });
    expect(event.type === "command.output" ? event.text : "").toBe(
      `${"stderr echoed"} ${secretEnvName}=[redacted]`
    );
    expect(JSON.stringify(event)).not.toContain(token);
  });

  it("redacts assistant text and approval subjects", () => {
    const token = ["sk", "c".repeat(28)].join("-");
    const assistant = redactWorkbenchEventContent({
      type: "assistant.text.delta",
      sessionId: "session-redaction",
      messageId: "message-1",
      text: `Do not store ${token}`,
      at: "2026-06-22T00:00:00.000Z"
    });
    const approval = redactWorkbenchEventContent({
      type: "approval.requested",
      sessionId: "session-redaction",
      approval: {
        id: "approval-1",
        kind: "command",
        title: "Run command",
        subject: `echo ${token}`,
        status: "pending"
      },
      at: "2026-06-22T00:00:00.000Z"
    });

    expect(assistant.type === "assistant.text.delta" ? assistant.text : "").toBe(
      "Do not store [redacted]"
    );
    expect(approval.type === "approval.requested" ? approval.approval.subject : "").toBe(
      "echo [redacted]"
    );
  });

  it("redacts run attempt prompt summaries and error messages", () => {
    const secretEnvName = ["ANTHROPIC", "API", "KEY"].join("_");
    const token = ["sk", "e".repeat(28)].join("-");
    const started = redactWorkbenchEventContent({
      type: "run.attempt.started",
      sessionId: "session-redaction",
      attempt: {
        id: "attempt-1",
        mode: "claude-live",
        status: "running",
        promptSummary: `Use ${secretEnvName}=${token}`,
        commandPreview: `claude --env ${secretEnvName}=${token}`
      },
      at: "2026-06-22T00:00:00.000Z"
    });
    const updated = redactWorkbenchEventContent({
      type: "run.attempt.updated",
      sessionId: "session-redaction",
      attemptId: "attempt-1",
      status: "failed",
      errorMessage: `stderr echoed ${secretEnvName}=${token}`,
      at: "2026-06-22T00:00:01.000Z"
    });

    expect(started.type === "run.attempt.started" ? started.attempt.promptSummary : "").toBe(
      `Use ${secretEnvName}=[redacted]`
    );
    expect(started.type === "run.attempt.started" ? started.attempt.commandPreview : "").toBe(
      `claude --env ${secretEnvName}=[redacted]`
    );
    expect(updated.type === "run.attempt.updated" ? updated.errorMessage : "").toBe(
      `${"stderr echoed"} ${secretEnvName}=[redacted]`
    );
    expect(JSON.stringify([started, updated])).not.toContain(token);
  });
});
