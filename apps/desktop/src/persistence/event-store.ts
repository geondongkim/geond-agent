import { invoke } from "@tauri-apps/api/core";
import { workbenchEventIdentity, type WorkbenchEvent } from "@geond-agent/ui-workbench";

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
  const eventIdentities = new Set<string>();

  return {
    driver: "memory-fallback",
    append: async (nextEvents) => {
      const insertedEvents = nextEvents.filter((event) => {
        const identity = workbenchEventIdentity(event);
        if (eventIdentities.has(identity)) {
          return false;
        }
        eventIdentities.add(identity);
        return true;
      });
      events.push(...insertedEvents);
      return insertedEvents.length;
    },
    list: async (sessionId) =>
      sessionId ? events.filter((event) => event.sessionId === sessionId) : [...events],
    deleteSession: async (sessionId) => {
      const previousLength = events.length;
      events
        .filter((event) => event.sessionId === sessionId)
        .forEach((event) => {
          eventIdentities.delete(workbenchEventIdentity(event));
        });
      events = events.filter((event) => event.sessionId !== sessionId);
      return previousLength - events.length;
    }
  };
}
