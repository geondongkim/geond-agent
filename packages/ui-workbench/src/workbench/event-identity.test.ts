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
});
