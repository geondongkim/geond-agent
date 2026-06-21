import { invoke } from "@tauri-apps/api/core";
import type { WorkbenchEvent } from "@geond-agent/ui-workbench";

export interface DesktopWorkbenchEventStore {
  readonly append: (events: readonly WorkbenchEvent[]) => Promise<number>;
  readonly list: (sessionId?: string) => Promise<readonly WorkbenchEvent[]>;
  readonly driver: "tauri-sqlite" | "memory-fallback";
}

export function createDesktopWorkbenchEventStore(
  fallback: DesktopWorkbenchEventStore = createMemoryWorkbenchEventStore()
): DesktopWorkbenchEventStore {
  return {
    driver: "tauri-sqlite",
    append: async (events) => {
      try {
        return await invoke<number>("append_workbench_events", { events });
      } catch {
        return fallback.append(events);
      }
    },
    list: async (sessionId) => {
      try {
        return await invoke<WorkbenchEvent[]>("list_workbench_events", { sessionId });
      } catch {
        return fallback.list(sessionId);
      }
    }
  };
}

export function createMemoryWorkbenchEventStore(): DesktopWorkbenchEventStore {
  const events: WorkbenchEvent[] = [];

  return {
    driver: "memory-fallback",
    append: async (nextEvents) => {
      events.push(...nextEvents);
      return nextEvents.length;
    },
    list: async (sessionId) =>
      sessionId ? events.filter((event) => event.sessionId === sessionId) : [...events]
  };
}
