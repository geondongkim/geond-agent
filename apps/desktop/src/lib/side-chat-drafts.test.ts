import { describe, expect, it } from "vitest";

import {
  createSideChatDraft,
  filterSideChatDraftsForSession,
  loadSideChatDrafts,
  normalizeSideChatDrafts,
  saveSideChatDrafts
} from "./side-chat-drafts.js";
import type { LocalSettingsStore } from "@geond-agent/ui-workbench";

describe("side chat drafts", () => {
  it("normalizes persisted draft values without keeping empty entries", () => {
    const drafts = normalizeSideChatDrafts([
      { id: "draft-a", text: "  Review terminal output.  ", sourceLabel: "cmd" },
      { id: "draft-empty", text: "   " },
      { text: "Keep this draft" },
      null
    ]);

    expect(drafts).toEqual([
      {
        id: "draft-a",
        text: "Review terminal output.",
        sessionId: undefined,
        sourceLabel: "cmd"
      },
      {
        id: "side-chat-draft-2",
        text: "Keep this draft",
        sessionId: undefined,
        sourceLabel: undefined
      }
    ]);
  });

  it("creates stable local-only draft records from text and source labels", () => {
    const draft = createSideChatDraft("  Follow up on selected evidence.  ", "file.ts", {
      now: 42,
      nonce: "unit",
      sessionId: "session-a"
    });

    expect(draft).toMatchObject({
      id: expect.stringMatching(/^side-chat-draft-42-.*-unit$/),
      text: "Follow up on selected evidence.",
      sessionId: "session-a",
      sourceLabel: "file.ts"
    });
    expect(createSideChatDraft("   ")).toBeUndefined();
  });

  it("redacts secret-looking draft text and source labels before persistence", () => {
    const anthropicAssignment = ["ANTHROPIC", "_API_KEY=sk-", "abcdefghijklmnopqrstuvwxyz"].join("");
    const zaiAssignment = ["ZAI", "_API_KEY=sk-", "abcdefghijklmnopqrstuvwxyz"].join("");
    const apiKeyAssignment = ["API", "_KEY=sk-", "abcdefghijklmnopqrstuvwxyz"].join("");

    expect(
      createSideChatDraft(anthropicAssignment, "TOKEN=super-secret-value", {
        now: 1,
        nonce: "safe",
        sessionId: "session-a"
      })
    ).toMatchObject({
      text: ["ANTHROPIC", "_API_KEY=[redacted]"].join(""),
      sourceLabel: "TOKEN=[redacted]"
    });

    expect(
      normalizeSideChatDrafts([
        {
          id: "draft-secret",
          text: zaiAssignment,
          sourceLabel: apiKeyAssignment
        }
      ])
    ).toEqual([
      {
        id: "draft-secret",
        text: ["ZAI", "_API_KEY=[redacted]"].join(""),
        sessionId: undefined,
        sourceLabel: ["API", "_KEY=[redacted]"].join("")
      }
    ]);
  });

  it("filters drafts to the active session while preserving legacy global drafts", () => {
    const drafts = normalizeSideChatDrafts([
      { id: "legacy", text: "Legacy draft" },
      { id: "session-a", text: "Session A draft", sessionId: "session-a" },
      { id: "session-b", text: "Session B draft", sessionId: "session-b" }
    ]);

    expect(filterSideChatDraftsForSession(drafts, "session-a")).toEqual([
      { id: "legacy", text: "Legacy draft", sessionId: undefined, sourceLabel: undefined },
      { id: "session-a", text: "Session A draft", sessionId: "session-a", sourceLabel: undefined }
    ]);
    expect(filterSideChatDraftsForSession(drafts, undefined)).toEqual([
      { id: "legacy", text: "Legacy draft", sessionId: undefined, sourceLabel: undefined }
    ]);
  });

  it("round trips through the local settings store", async () => {
    const storage = new Map<string, string>();
    const settingsStore: LocalSettingsStore = {
      getItem: (key) => storage.get(key) ?? null,
      setItem: (key, value) => {
        storage.set(key, value);
      },
      removeItem: (key) => {
        storage.delete(key);
      }
    };

    await saveSideChatDrafts(settingsStore, [
      { id: "draft-a", text: "Persist me", sessionId: "session-a", sourceLabel: "Review" }
    ]);

    await expect(loadSideChatDrafts(settingsStore)).resolves.toEqual([
      { id: "draft-a", text: "Persist me", sessionId: "session-a", sourceLabel: "Review" }
    ]);
  });
});
