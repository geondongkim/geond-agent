import type { WorkbenchPersistenceBoundary } from "@geond-agent/ui-workbench";

export const desktopPersistenceBoundary: WorkbenchPersistenceBoundary = {
  preferencesDriver: "tauri-app-data-json",
  durableEventStoreDriver: "sqlite",
  storesSecrets: false,
  storesRawLogs: false,
  notes: [
    "Settings use Tauri app-data JSON when native commands are available, with a renderer localStorage fallback in dev.",
    "SQLite stores normalized workbench events through a Tauri command boundary.",
    "This slice persists non-secret preferences and normalized events only; provider secrets and raw Claude logs are not stored."
  ]
};
