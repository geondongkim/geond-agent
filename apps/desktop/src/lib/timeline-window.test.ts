import { describe, expect, it } from "vitest";
import type { WorkbenchTimelineEntry } from "@geond-agent/ui-workbench";

import {
  EXPANDED_TIMELINE_HARD_CAP_EVENTS,
  EXPANDED_TIMELINE_INITIAL_VISIBLE_EVENTS,
  EXPANDED_TIMELINE_VISIBLE_EVENT_STEP,
  createExpandedTimelineRenderWindow,
  createTimelineRenderWindow,
  getNextExpandedTimelineBudget
} from "./timeline-window.js";

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

  it("uses an expanded budget instead of rendering every event in full view", () => {
    const entries = Array.from({ length: 5000 }, (_, index) => makeEntry(index + 1));
    const window = createExpandedTimelineRenderWindow(entries);

    expect(window.totalCount).toBe(5000);
    expect(window.visibleCount).toBe(EXPANDED_TIMELINE_INITIAL_VISIBLE_EVENTS);
    expect(window.hiddenMiddleCount).toBe(5000 - EXPANDED_TIMELINE_INITIAL_VISIBLE_EVENTS);
    expect(window.canIncreaseBudget).toBe(true);
    expect(window.hardCapReached).toBe(false);
    expect(window.headEntries[0]?.id).toBe("event-1");
    expect(window.tailEntries[window.tailEntries.length - 1]?.id).toBe("event-5000");
  });

  it("caps expanded full-view rendering at the hard cap", () => {
    const entries = Array.from({ length: 5000 }, (_, index) => makeEntry(index + 1));
    const window = createExpandedTimelineRenderWindow(entries, {
      budget: EXPANDED_TIMELINE_HARD_CAP_EVENTS + EXPANDED_TIMELINE_VISIBLE_EVENT_STEP
    });

    expect(window.visibleCount).toBe(EXPANDED_TIMELINE_HARD_CAP_EVENTS);
    expect(window.canIncreaseBudget).toBe(false);
    expect(window.hardCapReached).toBe(true);
    expect(window.hiddenMiddleCount).toBe(5000 - EXPANDED_TIMELINE_HARD_CAP_EVENTS);
  });

  it("increments expanded budgets up to the hard cap", () => {
    expect(getNextExpandedTimelineBudget(EXPANDED_TIMELINE_INITIAL_VISIBLE_EVENTS)).toBe(
      EXPANDED_TIMELINE_INITIAL_VISIBLE_EVENTS + EXPANDED_TIMELINE_VISIBLE_EVENT_STEP
    );
    expect(getNextExpandedTimelineBudget(EXPANDED_TIMELINE_HARD_CAP_EVENTS)).toBe(
      EXPANDED_TIMELINE_HARD_CAP_EVENTS
    );
  });
});
