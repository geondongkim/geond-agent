export interface LocalSettingsStore {
  readonly getItem: (key: string) => string | null | Promise<string | null>;
  readonly setItem: (key: string, value: string) => void | Promise<void>;
  readonly removeItem?: (key: string) => void | Promise<void>;
}

export function createMemoryLocalSettingsStore(
  initialValues: Readonly<Record<string, string>> = {}
): LocalSettingsStore {
  const values = new Map<string, string>(Object.entries(initialValues));

  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      values.set(key, value);
    },
    removeItem: (key) => {
      values.delete(key);
    }
  };
}
