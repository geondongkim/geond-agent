import { describe, expect, it } from "vitest";
import {
  createMemoryMaterializedEventStore,
  type WorkbenchCommandOutputRecord,
  type WorkbenchContextAttachmentRecord,
  type WorkbenchRunAttemptRecord
} from "./materialized-event-store.js";

describe("createMemoryMaterializedEventStore", () => {
  it("filters materialized inspector records by session id", async () => {
    const store = createMemoryMaterializedEventStore({
      contextAttachments: [
        {
          sessionId: "session-a",
          attachmentId: "context-a",
          kind: "workspace",
          title: "geond-agent",
          provenance: "desktop",
          contentState: "metadata-only"
        },
        {
          sessionId: "session-b",
          attachmentId: "context-b",
          kind: "file",
          title: "architecture.md",
          provenance: "desktop",
          contentState: "metadata-only"
        }
      ],
      commandOutputs: [
        {
          sessionId: "session-a",
          commandId: "cmd-verify",
          status: "succeeded",
          chunkCount: 2,
          stdoutPreview: "pnpm verify"
        }
      ]
    });

    await expect(store.listContextAttachments("session-a")).resolves.toEqual([
      expect.objectContaining({ attachmentId: "context-a" })
    ]);
    await expect(store.listContextAttachments("session-missing")).resolves.toEqual([]);
    await expect(store.listCommandOutputs("session-a")).resolves.toEqual([
      expect.objectContaining({ commandId: "cmd-verify", chunkCount: 2 })
    ]);
  });

  it("filters large materialized record families by session id", async () => {
    const contextAttachments: WorkbenchContextAttachmentRecord[] = Array.from(
      { length: 600 },
      (_, index) => ({
        sessionId: index % 2 === 0 ? "session-a" : "session-b",
        attachmentId: `context-${index}`,
        kind: index % 3 === 0 ? "workspace" : "file",
        title: `Context ${index}`,
        provenance: "desktop",
        contentState: "metadata-only",
        path: `/workspace/file-${index}.ts`
      })
    );
    const commandOutputs: WorkbenchCommandOutputRecord[] = Array.from(
      { length: 600 },
      (_, index) => ({
        sessionId: index % 2 === 0 ? "session-a" : "session-b",
        commandId: `cmd-${index}`,
        status: index % 7 === 0 ? "failed" : "succeeded",
        chunkCount: index + 1,
        stdoutPreview: `stdout ${index}`
      })
    );
    const runAttempts: WorkbenchRunAttemptRecord[] = Array.from({ length: 300 }, (_, index) => ({
      sessionId: index % 2 === 0 ? "session-a" : "session-b",
      attemptId: `attempt-${index}`,
      mode: "claude-live",
      status: index % 11 === 0 ? "failed" : "succeeded",
      providerRouteId: "zai.anthropic-compatible",
      modelProfileId: index % 5 === 0 ? "opus" : "sonnet",
      routingMode: "manual",
      eventCount: index + 2
    }));
    const store = createMemoryMaterializedEventStore({
      commandOutputs,
      contextAttachments,
      runAttempts
    });

    await expect(store.listContextAttachments("session-a")).resolves.toHaveLength(300);
    await expect(store.listContextAttachments("session-b")).resolves.toHaveLength(300);
    await expect(store.listCommandOutputs("session-a")).resolves.toHaveLength(300);
    await expect(store.listCommandOutputs("missing")).resolves.toEqual([]);
    await expect(store.listRunAttempts("session-a")).resolves.toHaveLength(150);
    await expect(store.listRunAttempts()).resolves.toHaveLength(300);
  });
});
