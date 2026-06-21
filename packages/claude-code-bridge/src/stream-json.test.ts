import { describe, expect, it } from "vitest";

import { CLAUDE_CODE_SANITIZED_STREAM_JSON_FIXTURE } from "./stream-json.fixtures.js";
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
        "Z.ai Anthropic-compatible route key presence is missing in this sanitized fixture."
      );
    }
  });

  it("keeps track of ignored records and emits a warning for unknown sanitized record types", () => {
    const result = normalizeClaudeCodeStreamJsonRecords(CLAUDE_CODE_SANITIZED_STREAM_JSON_FIXTURE);

    expect(result.ignoredRecords).toHaveLength(1);
    expect(result.ignoredRecords[0]?.index).toBe(13);

    const unknownWarning = result.events[result.events.length - 1];
    expect(unknownWarning).toEqual({
      type: "warning",
      sessionId: "claude-workbench-1",
      id: "sanitized-stream-json-13",
      message: 'Sanitized Claude stream-json record of type "unknown.record" is not mapped yet.',
      at: "2026-06-21T01:00:12.000Z"
    });
  });
});
