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

  it("filters and deletes a large session event stream without losing other sessions", async () => {
    const store = createMemoryWorkbenchEventStore();
    const events = Array.from({ length: 1200 }, (_, index): WorkbenchEvent => ({
      type: "command.output",
      sessionId: index % 3 === 0 ? "session-b" : "session-a",
      commandId: `cmd-${index}`,
      stream: index % 5 === 0 ? "stderr" : "stdout",
      text: `chunk ${index}`,
      status: index === 1199 ? "succeeded" : "running",
      at: `2026-06-22T00:${String(index % 60).padStart(2, "0")}:00.000Z`
    }));

    await expect(store.append(events)).resolves.toBe(1200);
    await expect(store.append(events.slice(0, 10))).resolves.toBe(0);
    await expect(store.list()).resolves.toHaveLength(1200);
    await expect(store.list("session-a")).resolves.toHaveLength(800);
    await expect(store.list("session-b")).resolves.toHaveLength(400);
    await expect(store.deleteSession("session-b")).resolves.toBe(400);
    await expect(store.list()).resolves.toHaveLength(800);
    await expect(store.append(events.filter((event) => event.sessionId === "session-b"))).resolves.toBe(400);
    await expect(store.list("session-b")).resolves.toHaveLength(400);
  });
});
