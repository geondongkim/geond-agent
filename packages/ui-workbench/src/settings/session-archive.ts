import type { LocalSettingsStore } from "./local-settings-store.js";

export const WORKBENCH_ARCHIVED_SESSION_IDS_SETTINGS_KEY =
  "geond-agent.workbench.archived-session-ids";

export function normalizeArchivedSessionIds(value: unknown): readonly string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return [
    ...new Set(
      value
        .filter((sessionId): sessionId is string => typeof sessionId === "string")
        .map((sessionId) => sessionId.trim())
        .filter((sessionId) => sessionId.length > 0)
    )
  ];
}

export async function loadWorkbenchArchivedSessionIds(
  store: LocalSettingsStore
): Promise<readonly string[]> {
  const raw = await store.getItem(WORKBENCH_ARCHIVED_SESSION_IDS_SETTINGS_KEY);
  if (!raw) {
    return [];
  }

  try {
    return normalizeArchivedSessionIds(JSON.parse(raw));
  } catch {
    return [];
  }
}

export async function saveWorkbenchArchivedSessionIds(
  store: LocalSettingsStore,
  sessionIds: readonly string[]
): Promise<readonly string[]> {
  const normalized = normalizeArchivedSessionIds(sessionIds);
  await store.setItem(
    WORKBENCH_ARCHIVED_SESSION_IDS_SETTINGS_KEY,
    JSON.stringify(normalized)
  );
  return normalized;
}
