import type { RoutingMode } from "../workbench/selection.js";
import {
  findBackendAdapter,
  findProviderRoute,
  resolveModelProfile,
  type WorkbenchSelectionCatalog
} from "../workbench/registry.js";
import type { LocalSettingsStore } from "./local-settings-store.js";

export const SESSION_DEFAULTS_SETTINGS_KEY = "geond-agent.workbench.session-defaults";

export type WorkbenchApprovalPolicy = "ask-first";
export type WorkbenchPermissionMode = "plan" | "default" | "acceptEdits";

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
  readonly defaultPermissionMode: WorkbenchPermissionMode;
  readonly approvalPolicy: WorkbenchApprovalPolicy;
}

export interface WorkbenchSessionDefaultsValidationResult {
  readonly defaults: WorkbenchSessionDefaults;
  readonly warnings: readonly string[];
}

interface WorkbenchSessionDefaultsInput {
  readonly defaultBackendAdapterId?: unknown;
  readonly defaultProviderRouteId?: unknown;
  readonly defaultModelAlias?: unknown;
  readonly routingMode?: unknown;
  readonly defaultPermissionMode?: unknown;
  readonly approvalPolicy?: unknown;
}

export const DEFAULT_WORKBENCH_PERSISTENCE_BOUNDARY: WorkbenchPersistenceBoundary = {
  preferencesDriver: "tauri-app-data-json",
  durableEventStoreDriver: "sqlite",
  storesSecrets: false,
  storesRawLogs: false,
  notes: [
    "Tauri stores non-secret preferences in app-data JSON and normalized workbench events in SQLite.",
    "A durable session index may be materialized from events, but secret values and raw Claude logs stay out of tracked persistence."
  ]
};

export const DEFAULT_WORKBENCH_SESSION_DEFAULTS: WorkbenchSessionDefaults = {
  defaultBackendAdapterId: "claude-code.external-cli-acp",
  defaultProviderRouteId: "zai.anthropic-compatible",
  defaultModelAlias: "sonnet",
  routingMode: "manual",
  defaultPermissionMode: "plan",
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
    defaultPermissionMode: normalizePermissionMode(value?.defaultPermissionMode),
    approvalPolicy: normalizeApprovalPolicy(value?.approvalPolicy)
  };
}

export function validateWorkbenchSessionDefaults(
  defaults: WorkbenchSessionDefaults,
  catalog: WorkbenchSelectionCatalog
): WorkbenchSessionDefaultsValidationResult {
  const warnings: string[] = [];
  const nextDefaults: MutableWorkbenchSessionDefaults = { ...defaults };

  if (!findBackendAdapter(catalog, defaults.defaultBackendAdapterId)) {
    warnings.push(
      `Unknown backend adapter "${defaults.defaultBackendAdapterId}" fell back to ${DEFAULT_WORKBENCH_SESSION_DEFAULTS.defaultBackendAdapterId}.`
    );
    nextDefaults.defaultBackendAdapterId =
      DEFAULT_WORKBENCH_SESSION_DEFAULTS.defaultBackendAdapterId;
  }

  if (!findProviderRoute(catalog, defaults.defaultProviderRouteId)) {
    warnings.push(
      `Unknown provider route "${defaults.defaultProviderRouteId}" fell back to ${DEFAULT_WORKBENCH_SESSION_DEFAULTS.defaultProviderRouteId}.`
    );
    nextDefaults.defaultProviderRouteId =
      DEFAULT_WORKBENCH_SESSION_DEFAULTS.defaultProviderRouteId;
  }

  if (
    !resolveModelProfile(
      catalog,
      defaults.defaultModelAlias,
      nextDefaults.defaultProviderRouteId
    )
  ) {
    warnings.push(
      `Unknown model alias "${defaults.defaultModelAlias}" fell back to ${DEFAULT_WORKBENCH_SESSION_DEFAULTS.defaultModelAlias}.`
    );
    nextDefaults.defaultModelAlias =
      DEFAULT_WORKBENCH_SESSION_DEFAULTS.defaultModelAlias;
  }

  return {
    defaults: nextDefaults,
    warnings
  };
}

type MutableWorkbenchSessionDefaults = {
  -readonly [Key in keyof WorkbenchSessionDefaults]: WorkbenchSessionDefaults[Key];
};

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

function normalizePermissionMode(value: unknown): WorkbenchPermissionMode {
  switch (value) {
    case "default":
    case "acceptEdits":
      return value;
    default:
      return DEFAULT_WORKBENCH_SESSION_DEFAULTS.defaultPermissionMode;
  }
}

function readNonEmptyString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}
