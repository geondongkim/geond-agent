import { invoke } from "@tauri-apps/api/core";
import {
  createEmptyWorkbenchSessionIndex,
  createWorkbenchSessionIndexFromEntries,
  listWorkbenchSessionIndexEntries,
  type WorkbenchSessionIndexEntry,
  type WorkbenchSessionIndexSnapshot
} from "@geond-agent/ui-workbench";

export interface DesktopWorkbenchSessionIndexStore {
  readonly list: () => Promise<readonly WorkbenchSessionIndexEntry[]>;
  readonly replaceMemoryIndex: (index: WorkbenchSessionIndexSnapshot) => void;
  readonly driver: "tauri-sqlite" | "memory-fallback";
}

export function createDesktopWorkbenchSessionIndexStore(
  fallback: DesktopWorkbenchSessionIndexStore = createMemoryWorkbenchSessionIndexStore()
): DesktopWorkbenchSessionIndexStore {
  return {
    driver: "tauri-sqlite",
    list: async () => {
      try {
        return await invoke<WorkbenchSessionIndexEntry[]>("list_workbench_sessions");
      } catch {
        return fallback.list();
      }
    },
    replaceMemoryIndex: (index) => {
      fallback.replaceMemoryIndex(index);
    }
  };
}

export function createMemoryWorkbenchSessionIndexStore(): DesktopWorkbenchSessionIndexStore {
  let index = createEmptyWorkbenchSessionIndex();

  return {
    driver: "memory-fallback",
    list: async () => listWorkbenchSessionIndexEntries(index),
    replaceMemoryIndex: (nextIndex) => {
      index = createWorkbenchSessionIndexFromEntries(
        listWorkbenchSessionIndexEntries(nextIndex)
      );
    }
  };
}
