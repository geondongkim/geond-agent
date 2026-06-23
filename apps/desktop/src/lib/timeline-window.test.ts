import { describe, expect, it } from "vitest";
import type { WorkbenchTimelineEntry } from "@geond-agent/ui-workbench";

import { createTimelineRenderWindow } from "./timeline-window.js";

function makeEntry(index: number): WorkbenchTimelineEntry {
  return {
    id: `event-${index}`,
    kind: "assistant",
    title: `Event ${index}`
  };
}

describe("createTimelineRenderWindow", () => {
  it("keeps short timelines intact", () => {
    const entries = [makeEntry(1), makeEntry(2), makeEntry(3)];

    expect(createTimelineRenderWindow(entries, { maxVisible: 5 })).toEqual({
      totalCount: 3,
      visibleCount: 3,
      hiddenMiddleCount: 0,
      headEntries: entries,
      tailEntries: []
    });
  });

  it("keeps stable head and latest tail entries for long timelines", () => {
    const entries = Array.from({ length: 10 }, (_, index) => makeEntry(index + 1));
    const window = createTimelineRenderWindow(entries, { maxVisible: 5, headCount: 2 });

    expect(window.totalCount).toBe(10);
    expect(window.visibleCount).toBe(5);
    expect(window.hiddenMiddleCount).toBe(5);
    expect(window.headEntries.map((entry) => entry.id)).toEqual(["event-1", "event-2"]);
    expect(window.tailEntries.map((entry) => entry.id)).toEqual([
      "event-8",
      "event-9",
      "event-10"
    ]);
  });

  it("keeps at least one tail entry when the visible budget is tiny", () => {
    const entries = Array.from({ length: 4 }, (_, index) => makeEntry(index + 1));
    const window = createTimelineRenderWindow(entries, { maxVisible: 1, headCount: 5 });

    expect(window.visibleCount).toBe(1);
    expect(window.headEntries).toEqual([]);
    expect(window.tailEntries.map((entry) => entry.id)).toEqual(["event-4"]);
  });
});
