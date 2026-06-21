import type { WorkbenchPersistenceBoundary } from "@geond-agent/ui-workbench";

export const desktopPersistenceBoundary: WorkbenchPersistenceBoundary = {
  preferencesDriver: "tauri-app-data-json",
  durableEventStoreDriver: "sqlite",
  storesSecrets: false,
  storesRawLogs: false,
  notes: [
    "Settings use a renderer localStorage fallback in dev and should converge to Tauri app-data JSON.",
    "TODO: keep SQLite behind a typed Tauri boundary until event storage settles.",
    "This slice persists non-secret preferences only and does not store provider secrets or raw Claude logs."
  ]
};
