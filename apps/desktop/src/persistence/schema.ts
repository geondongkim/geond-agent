import type { WorkbenchPersistenceBoundary } from "@geond-agent/ui-workbench";

export const desktopPersistenceBoundary: WorkbenchPersistenceBoundary = {
  preferencesDriver: "tauri-app-data-json",
  durableEventStoreDriver: "sqlite",
  storesSecrets: false,
  storesRawLogs: false,
  notes: [
    "Settings use Tauri app-data JSON when native commands are available, with a renderer localStorage fallback in dev.",
    "SQLite stores normalized workbench events through a Tauri command boundary with versioned schema migrations.",
    "Approval requests and resolutions are materialized into a queryable approvals table derived from normalized events.",
    "Context attachments, tool calls, command output previews, diff summaries, and usage metadata are materialized from events for inspector/query surfaces.",
    "Side chat drafts are persisted as local app-data JSON preferences so private follow-up notes do not become normalized transcript events until the user explicitly dispatches them.",
    "Tauri query commands expose the materialized inspector tables through a typed renderer client without exposing raw Claude logs or provider secrets.",
    "This slice persists non-secret preferences and normalized events only; provider secrets and raw Claude logs are not stored."
  ]
};
