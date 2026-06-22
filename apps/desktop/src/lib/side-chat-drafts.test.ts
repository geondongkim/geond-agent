import { describe, expect, it } from "vitest";

import {
  createSideChatDraft,
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
        sourceLabel: "cmd"
      },
      {
        id: "side-chat-draft-2",
        text: "Keep this draft",
        sourceLabel: undefined
      }
    ]);
  });

  it("creates stable local-only draft records from text and source labels", () => {
    const draft = createSideChatDraft("  Follow up on selected evidence.  ", "file.ts", 42);

    expect(draft).toMatchObject({
      id: expect.stringMatching(/^side-chat-draft-42-/),
      text: "Follow up on selected evidence.",
      sourceLabel: "file.ts"
    });
    expect(createSideChatDraft("   ")).toBeUndefined();
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
      { id: "draft-a", text: "Persist me", sourceLabel: "Review" }
    ]);

    await expect(loadSideChatDrafts(settingsStore)).resolves.toEqual([
      { id: "draft-a", text: "Persist me", sourceLabel: "Review" }
    ]);
  });
});
