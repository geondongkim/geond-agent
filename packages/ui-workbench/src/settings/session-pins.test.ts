import { describe, expect, it } from "vitest";

import { createMemoryLocalSettingsStore } from "./local-settings-store.js";
import {
  WORKBENCH_PINNED_SESSION_IDS_SETTINGS_KEY,
  loadWorkbenchPinnedSessionIds,
  normalizePinnedSessionIds,
  saveWorkbenchPinnedSessionIds
} from "./session-pins.js";

describe("Workbench pinned session settings", () => {
  it("normalizes pinned session ids without preserving empty or duplicate entries", () => {
    expect(normalizePinnedSessionIds([" session-a ", "", "session-a", "session-b", 1])).toEqual([
      "session-a",
      "session-b"
    ]);
  });

  it("round-trips pinned session ids through the local settings boundary", async () => {
    const store = createMemoryLocalSettingsStore();

    const saved = await saveWorkbenchPinnedSessionIds(store, [
      "session-a",
      "session-a",
      "session-b"
    ]);
    const loaded = await loadWorkbenchPinnedSessionIds(store);

    expect(saved).toEqual(["session-a", "session-b"]);
    expect(loaded).toEqual(["session-a", "session-b"]);
    expect(store.getItem(WORKBENCH_PINNED_SESSION_IDS_SETTINGS_KEY)).toBe(
      JSON.stringify(["session-a", "session-b"])
    );
  });

  it("falls back to an empty list when stored JSON is invalid", async () => {
    const store = createMemoryLocalSettingsStore({
      [WORKBENCH_PINNED_SESSION_IDS_SETTINGS_KEY]: "{not-json}"
    });

    await expect(loadWorkbenchPinnedSessionIds(store)).resolves.toEqual([]);
  });
});
