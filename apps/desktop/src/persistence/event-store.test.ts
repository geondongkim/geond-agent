import { describe, expect, it } from "vitest";

import type { WorkbenchEvent } from "@geond-agent/ui-workbench";

import { createMemoryWorkbenchEventStore } from "./event-store.js";

describe("createMemoryWorkbenchEventStore", () => {
  it("deduplicates structurally identical events", async () => {
    const store = createMemoryWorkbenchEventStore();
    const event: WorkbenchEvent = {
      type: "command.output",
      sessionId: "session-1",
      commandId: "cmd-1",
      stream: "stdout",
      text: "pnpm verify",
      status: "running",
      at: "2026-06-22T00:00:00.000Z"
    };

    await expect(store.append([event, { ...event }])).resolves.toBe(1);
    await expect(store.list("session-1")).resolves.toHaveLength(1);
  });

  it("allows deleted session events to be appended again", async () => {
    const store = createMemoryWorkbenchEventStore();
    const event: WorkbenchEvent = {
      type: "warning",
      sessionId: "session-1",
      id: "warning-1",
      message: "retryable warning",
      at: "2026-06-22T00:00:00.000Z"
    };

    await store.append([event]);
    await expect(store.deleteSession("session-1")).resolves.toBe(1);
    await expect(store.append([event])).resolves.toBe(1);
    await expect(store.list("session-1")).resolves.toHaveLength(1);
  });
});
