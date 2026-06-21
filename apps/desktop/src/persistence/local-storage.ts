import type { LocalSettingsStore } from "@geond-agent/ui-workbench";

export function createBrowserLocalSettingsStore(
  storage: Storage | undefined = globalThis.localStorage
): LocalSettingsStore {
  return {
    getItem: (key) => safeRead(storage, key),
    setItem: (key, value) => {
      storage?.setItem(key, value);
    },
    removeItem: (key) => {
      storage?.removeItem(key);
    }
  };
}

function safeRead(storage: Storage | undefined, key: string): string | null {
  try {
    return storage?.getItem(key) ?? null;
  } catch {
    return null;
  }
}
