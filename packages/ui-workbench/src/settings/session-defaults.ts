import type { RoutingMode } from "../workbench/selection.js";
import type { LocalSettingsStore } from "./local-settings-store.js";

export const SESSION_DEFAULTS_SETTINGS_KEY = "geond-agent.workbench.session-defaults";

export type WorkbenchApprovalPolicy = "ask-first";

export interface WorkbenchPersistenceBoundary {
  readonly preferencesDriver: "tauri-app-data-json";
  readonly durableEventStoreDriver: "sqlite";
  readonly storesSecrets: false;
  readonly storesRawLogs: false;
  readonly notes: readonly string[];
}

export interface WorkbenchSessionDefaults {
  readonly defaultBackendAdapterId: string;
  readonly defaultProviderRouteId: string;
  readonly defaultModelAlias: string;
  readonly routingMode: RoutingMode;
  readonly approvalPolicy: WorkbenchApprovalPolicy;
}

interface WorkbenchSessionDefaultsInput {
  readonly defaultBackendAdapterId?: unknown;
  readonly defaultProviderRouteId?: unknown;
  readonly defaultModelAlias?: unknown;
  readonly routingMode?: unknown;
  readonly approvalPolicy?: unknown;
}

export const DEFAULT_WORKBENCH_PERSISTENCE_BOUNDARY: WorkbenchPersistenceBoundary = {
  preferencesDriver: "tauri-app-data-json",
  durableEventStoreDriver: "sqlite",
  storesSecrets: false,
  storesRawLogs: false,
  notes: [
    "TODO: wire SQLite persistence through Tauri commands after the event schema stabilizes.",
    "Compact normalized events may be stored later, but secret values and raw Claude logs stay out of tracked persistence."
  ]
};

export const DEFAULT_WORKBENCH_SESSION_DEFAULTS: WorkbenchSessionDefaults = {
  defaultBackendAdapterId: "claude-code.external-cli-acp",
  defaultProviderRouteId: "zai.anthropic-compatible",
  defaultModelAlias: "sonnet",
  routingMode: "manual",
  approvalPolicy: "ask-first"
};

export function normalizeWorkbenchSessionDefaults(
  value: WorkbenchSessionDefaultsInput | undefined
): WorkbenchSessionDefaults {
  return {
    defaultBackendAdapterId:
      readNonEmptyString(value?.defaultBackendAdapterId) ??
      DEFAULT_WORKBENCH_SESSION_DEFAULTS.defaultBackendAdapterId,
    defaultProviderRouteId:
      readNonEmptyString(value?.defaultProviderRouteId) ??
      DEFAULT_WORKBENCH_SESSION_DEFAULTS.defaultProviderRouteId,
    defaultModelAlias:
      readNonEmptyString(value?.defaultModelAlias) ??
      DEFAULT_WORKBENCH_SESSION_DEFAULTS.defaultModelAlias,
    routingMode: normalizeRoutingMode(value?.routingMode),
    approvalPolicy: normalizeApprovalPolicy(value?.approvalPolicy)
  };
}

export async function loadWorkbenchSessionDefaults(
  store: LocalSettingsStore
): Promise<WorkbenchSessionDefaults> {
  const rawValue = await store.getItem(SESSION_DEFAULTS_SETTINGS_KEY);

  if (!rawValue) {
    return DEFAULT_WORKBENCH_SESSION_DEFAULTS;
  }

  try {
    return normalizeWorkbenchSessionDefaults(
      JSON.parse(rawValue) as WorkbenchSessionDefaultsInput
    );
  } catch {
    return DEFAULT_WORKBENCH_SESSION_DEFAULTS;
  }
}

export async function saveWorkbenchSessionDefaults(
  store: LocalSettingsStore,
  settings: WorkbenchSessionDefaults
): Promise<void> {
  await store.setItem(
    SESSION_DEFAULTS_SETTINGS_KEY,
    JSON.stringify(normalizeWorkbenchSessionDefaults(settings))
  );
}

function normalizeRoutingMode(value: unknown): RoutingMode {
  return value === "auto" ? "auto" : DEFAULT_WORKBENCH_SESSION_DEFAULTS.routingMode;
}

function normalizeApprovalPolicy(value: unknown): WorkbenchApprovalPolicy {
  return value === "ask-first"
    ? value
    : DEFAULT_WORKBENCH_SESSION_DEFAULTS.approvalPolicy;
}

function readNonEmptyString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}
