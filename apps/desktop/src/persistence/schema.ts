import type { WorkbenchPersistenceBoundary } from "@geond-agent/ui-workbench";

export const desktopPersistenceBoundary: WorkbenchPersistenceBoundary = {
  preferencesDriver: "tauri-app-data-json",
  durableEventStoreDriver: "sqlite",
  storesSecrets: false,
  storesRawLogs: false,
  notes: [
    "TODO: keep SQLite behind a typed Tauri boundary until event storage settles.",
    "The first slice shows the persistence contract only and does not store provider secrets or raw Claude logs."
  ]
};
