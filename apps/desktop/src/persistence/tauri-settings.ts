import { invoke } from "@tauri-apps/api/core";
import type { LocalSettingsStore } from "@geond-agent/ui-workbench";

import { createBrowserLocalSettingsStore } from "./local-storage.js";

export const WORKSPACE_SETTINGS_KEY = "geond-agent.workbench.workspace";
export const RUNNER_MODE_SETTINGS_KEY = "geond-agent.workbench.runner-mode";
export const LAYOUT_SETTINGS_KEY = "geond-agent.workbench.layout";
export { SIDE_CHAT_DRAFTS_SETTINGS_KEY } from "../lib/side-chat-drafts.js";
export { RECENT_CONTEXT_SETTINGS_KEY } from "../lib/recent-context.js";

export function createDesktopLocalSettingsStore(
  fallback: LocalSettingsStore = createBrowserLocalSettingsStore()
): LocalSettingsStore {
  return {
    getItem: async (key) => {
      try {
        return await invoke<string | null>("load_app_setting", { key });
      } catch {
        return fallback.getItem(key);
      }
    },
    setItem: async (key, value) => {
      try {
        await invoke("save_app_setting", { key, value });
      } catch {
        // Vite/browser fallback for renderer-only development.
      }
      await fallback.setItem(key, value);
    },
    removeItem: async (key) => {
      try {
        await invoke("remove_app_setting", { key });
      } catch {
        // Vite/browser fallback for renderer-only development.
      }
      await fallback.removeItem?.(key);
    }
  };
}
