import { describe, expect, it } from "vitest";
import { createMemoryMaterializedEventStore } from "./materialized-event-store.js";

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
});
