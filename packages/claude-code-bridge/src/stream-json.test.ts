import { describe, expect, it } from "vitest";

import {
  CLAUDE_CODE_PERMISSION_DENIAL_STREAM_JSON_FIXTURE,
  CLAUDE_CODE_REAL_STREAM_JSON_FIXTURE,
  CLAUDE_CODE_SANITIZED_STREAM_JSON_FIXTURE
} from "./stream-json.fixtures.js";
import { normalizeClaudeCodeStreamJsonRecords } from "./stream-json.js";

describe("normalizeClaudeCodeStreamJsonRecords", () => {
  it("maps sanitized stream-json fixture records into normalized workbench events", () => {
    const result = normalizeClaudeCodeStreamJsonRecords(CLAUDE_CODE_SANITIZED_STREAM_JSON_FIXTURE);

    expect(result.events.map((event) => event.type)).toEqual([
      "session.lifecycle",
      "assistant.text.delta",
      "plan.updated",
      "tool.call.started",
      "tool.call.updated",
      "command.output",
      "usage.reported",
      "diff.emitted",
      "approval.requested",
      "approval.resolved",
      "approval.requested",
      "warning",
      "assistant.text.completed",
      "session.lifecycle",
      "warning"
    ]);

    const sessionStarted = result.events[0];
    if (!sessionStarted) {
      throw new Error("Expected the fixture to emit a session lifecycle event");
    }
    expect(sessionStarted.type).toBe("session.lifecycle");
    if (sessionStarted.type === "session.lifecycle") {
      expect(sessionStarted.selection?.backendAdapter?.label).toBe(
        "Claude Code external CLI/ACP candidate"
      );
      expect(sessionStarted.selection?.modelProfile?.label).toBe("sonnet alias -> GLM 4.7");
      expect(sessionStarted.selection?.capabilityWarnings).toContain(
        "Z.ai Anthropic-compatible route key presence is not stored in workbench events."
      );
      expect(sessionStarted.selection?.readiness?.level).toBe("blocked");
      expect(sessionStarted.selection?.readiness?.items.map((item) => item.id)).toEqual([
        "backend-adapter",
        "provider-route",
        "model-profile",
        "routing-mode"
      ]);
    }
  });

  it("maps real Claude Code stream-json envelopes into normalized workbench events", () => {
    const result = normalizeClaudeCodeStreamJsonRecords(CLAUDE_CODE_REAL_STREAM_JSON_FIXTURE);

    expect(result.ignoredRecords).toHaveLength(0);
    expect(result.events.map((event) => event.type)).toEqual([
      "session.lifecycle",
      "session.adapter.linked",
      "assistant.text.delta",
      "assistant.text.delta",
      "tool.call.started",
      "tool.call.updated",
      "assistant.text.completed",
      "usage.reported",
      "usage.reported",
      "command.output",
      "session.lifecycle"
    ]);

    const sessionStarted = result.events[0];
    expect(sessionStarted?.type).toBe("session.lifecycle");
    if (sessionStarted?.type === "session.lifecycle") {
      expect(sessionStarted.workspacePath).toBe("/workspace/geond-agent");
      expect(sessionStarted.selection?.modelProfile?.label).toBe("GLM 5.2");
      expect(sessionStarted.selection?.readiness?.level).toBe("blocked");
    }

    const adapterLinked = result.events[1];
    expect(adapterLinked).toMatchObject({
      type: "session.adapter.linked",
      sessionId: "real-claude-session-1",
      adapterId: "claude-code.external-cli-acp",
      externalSessionId: "real-claude-session-1"
    });

    const streamedText = result.events
      .filter((event) => event.type === "assistant.text.delta")
      .map((event) => event.text)
      .join("");
    expect(streamedText).toBe("I read the workspace docs.");

    const toolStarted = result.events.find((event) => event.type === "tool.call.started");
    expect(toolStarted).toMatchObject({
      type: "tool.call.started",
      toolCall: {
        id: "call-read-readme",
        name: "Read",
        inputSummary: "{\"file_path\":\"/workspace/geond-agent/README.md\"}"
      }
    });

    const resultUsage = result.events.find(
      (event) => event.type === "usage.reported" && event.usage.source === "provider"
    );
    expect(resultUsage).toMatchObject({
      type: "usage.reported",
      usage: {
        model: "glm-5.2",
        inputTokens: 260,
        outputTokens: 38,
        costUsd: 0.001
      }
    });
  });

  it("keeps workbench session ids separate from Claude Code conversation ids", () => {
    const result = normalizeClaudeCodeStreamJsonRecords(CLAUDE_CODE_REAL_STREAM_JSON_FIXTURE, {
      workbenchSessionId: "workbench-session-1",
      resumedFromExternalSessionId: "real-claude-session-1"
    });

    expect(result.events[0]).toMatchObject({
      type: "session.lifecycle",
      sessionId: "workbench-session-1",
      lifecycle: "resumed"
    });
    expect(result.events[1]).toMatchObject({
      type: "session.adapter.linked",
      sessionId: "workbench-session-1",
      externalSessionId: "real-claude-session-1",
      resumedFromExternalSessionId: "real-claude-session-1"
    });
    expect(result.events.every((event) => event.sessionId === "workbench-session-1")).toBe(true);
  });

  it("maps Claude Code permission denials into pending approval requests", () => {
    const result = normalizeClaudeCodeStreamJsonRecords(
      CLAUDE_CODE_PERMISSION_DENIAL_STREAM_JSON_FIXTURE
    );

    const approvals = result.events.filter((event) => event.type === "approval.requested");
    expect(approvals).toHaveLength(2);
    expect(approvals[0]).toMatchObject({
      type: "approval.requested",
      sessionId: "permission-probe-session",
      approval: {
        id: "claude-code-permission:call-bash-denied",
        kind: "command",
        title: "Approve Claude Code Bash action",
        subject: "echo ok > approval-probe-output.txt",
        status: "pending"
      }
    });
    expect(approvals[1]).toMatchObject({
      type: "approval.requested",
      sessionId: "permission-probe-session",
      approval: {
        id: "claude-code-permission:call-edit-denied",
        kind: "filesystem",
        title: "Approve Claude Code Edit action",
        subject: "/tmp/geond-agent-approval-probe/approval-probe-output.txt",
        status: "pending"
      }
    });
    expect(result.ignoredRecords).toHaveLength(0);
  });

  it("keeps track of ignored records and emits a warning for unknown sanitized record types", () => {
    const result = normalizeClaudeCodeStreamJsonRecords(CLAUDE_CODE_SANITIZED_STREAM_JSON_FIXTURE);

    expect(result.ignoredRecords).toHaveLength(1);
    expect(result.ignoredRecords[0]?.index).toBe(14);

    const unknownWarning = result.events[result.events.length - 1];
    expect(unknownWarning).toEqual({
      type: "warning",
      sessionId: "claude-workbench-1",
      id: "sanitized-stream-json-14",
      message: 'Claude stream-json record of type "unknown.record" is not mapped yet.',
      at: "2026-06-21T01:00:12.000Z"
    });
  });
});
