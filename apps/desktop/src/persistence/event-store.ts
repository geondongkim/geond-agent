import { invoke } from "@tauri-apps/api/core";
import type { WorkbenchEvent } from "@geond-agent/ui-workbench";

export interface DesktopWorkbenchEventStore {
  readonly append: (events: readonly WorkbenchEvent[]) => Promise<number>;
  readonly list: (sessionId?: string) => Promise<readonly WorkbenchEvent[]>;
  readonly deleteSession: (sessionId: string) => Promise<number>;
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
    },
    deleteSession: async (sessionId) => {
      try {
        return await invoke<number>("delete_workbench_session_events", { sessionId });
      } catch {
        return fallback.deleteSession(sessionId);
      }
    }
  };
}

export function createMemoryWorkbenchEventStore(): DesktopWorkbenchEventStore {
  let events: WorkbenchEvent[] = [];

  return {
    driver: "memory-fallback",
    append: async (nextEvents) => {
      events.push(...nextEvents);
      return nextEvents.length;
    },
    list: async (sessionId) =>
      sessionId ? events.filter((event) => event.sessionId === sessionId) : [...events],
    deleteSession: async (sessionId) => {
      const previousLength = events.length;
      events = events.filter((event) => event.sessionId !== sessionId);
      return previousLength - events.length;
    }
  };
}
