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

export const DEFAULT_MAX_VISIBLE_TIMELINE_EVENTS = 180;
export const DEFAULT_HEAD_TIMELINE_EVENTS = 12;
export const EXPANDED_TIMELINE_INITIAL_VISIBLE_EVENTS = 720;
export const EXPANDED_TIMELINE_VISIBLE_EVENT_STEP = 720;
export const EXPANDED_TIMELINE_HARD_CAP_EVENTS = 2400;

export interface ExpandedTimelineRenderWindow extends TimelineRenderWindow {
  readonly budget: number;
  readonly hardCap: number;
  readonly canIncreaseBudget: boolean;
  readonly hardCapReached: boolean;
}

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

export function createExpandedTimelineRenderWindow(
  entries: readonly WorkbenchTimelineEntry[],
  options: TimelineRenderWindowOptions & {
    readonly budget?: number;
    readonly hardCap?: number;
  } = {}
): ExpandedTimelineRenderWindow {
  const hardCap = Math.max(1, options.hardCap ?? EXPANDED_TIMELINE_HARD_CAP_EVENTS);
  const requestedBudget = Math.max(
    1,
    options.budget ?? EXPANDED_TIMELINE_INITIAL_VISIBLE_EVENTS
  );
  const budget = Math.min(requestedBudget, hardCap);
  const window = createTimelineRenderWindow(entries, {
    headCount: options.headCount,
    maxVisible: budget
  });
  const nextBudget = Math.min(
    budget + EXPANDED_TIMELINE_VISIBLE_EVENT_STEP,
    hardCap,
    entries.length
  );

  return {
    ...window,
    budget,
    hardCap,
    canIncreaseBudget: nextBudget > budget,
    hardCapReached: entries.length > hardCap && budget >= hardCap
  };
}

export function getNextExpandedTimelineBudget(currentBudget: number): number {
  return Math.min(
    currentBudget + EXPANDED_TIMELINE_VISIBLE_EVENT_STEP,
    EXPANDED_TIMELINE_HARD_CAP_EVENTS
  );
}
