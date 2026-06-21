import type { LocalSettingsStore } from "./local-settings-store.js";

export const WORKBENCH_PINNED_SESSION_IDS_SETTINGS_KEY =
  "geond-agent.workbench.pinned-session-ids";

export function normalizePinnedSessionIds(value: unknown): readonly string[] {
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

export async function loadWorkbenchPinnedSessionIds(
  store: LocalSettingsStore
): Promise<readonly string[]> {
  const raw = await store.getItem(WORKBENCH_PINNED_SESSION_IDS_SETTINGS_KEY);
  if (!raw) {
    return [];
  }

  try {
    return normalizePinnedSessionIds(JSON.parse(raw));
  } catch {
    return [];
  }
}

export async function saveWorkbenchPinnedSessionIds(
  store: LocalSettingsStore,
  sessionIds: readonly string[]
): Promise<readonly string[]> {
  const normalized = normalizePinnedSessionIds(sessionIds);
  await store.setItem(
    WORKBENCH_PINNED_SESSION_IDS_SETTINGS_KEY,
    JSON.stringify(normalized)
  );
  return normalized;
}
