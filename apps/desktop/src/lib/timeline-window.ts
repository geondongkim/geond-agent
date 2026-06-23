import type { WorkbenchTimelineEntry } from "@geond-agent/ui-workbench";

export interface TimelineRenderWindow {
  readonly totalCount: number;
  readonly visibleCount: number;
  readonly hiddenMiddleCount: number;
  readonly headEntries: readonly WorkbenchTimelineEntry[];
  readonly tailEntries: readonly WorkbenchTimelineEntry[];
}

export interface TimelineRenderWindowOptions {
  readonly maxVisible?: number;
  readonly headCount?: number;
}

const DEFAULT_MAX_VISIBLE_TIMELINE_EVENTS = 180;
const DEFAULT_HEAD_TIMELINE_EVENTS = 12;

export function createTimelineRenderWindow(
  entries: readonly WorkbenchTimelineEntry[],
  options: TimelineRenderWindowOptions = {}
): TimelineRenderWindow {
  const totalCount = entries.length;
  const maxVisible = Math.max(1, options.maxVisible ?? DEFAULT_MAX_VISIBLE_TIMELINE_EVENTS);

  if (totalCount <= maxVisible) {
    return {
      totalCount,
      visibleCount: totalCount,
      hiddenMiddleCount: 0,
      headEntries: entries,
      tailEntries: []
    };
  }

  const requestedHeadCount = Math.max(0, options.headCount ?? DEFAULT_HEAD_TIMELINE_EVENTS);
  const headCount = Math.min(requestedHeadCount, maxVisible - 1);
  const tailCount = Math.max(maxVisible - headCount, 1);
  const hiddenMiddleCount = Math.max(totalCount - headCount - tailCount, 0);

  return {
    totalCount,
    visibleCount: headCount + tailCount,
    hiddenMiddleCount,
    headEntries: entries.slice(0, headCount),
    tailEntries: entries.slice(totalCount - tailCount)
  };
}
