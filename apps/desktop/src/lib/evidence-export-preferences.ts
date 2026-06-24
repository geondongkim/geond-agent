import type { LocalSettingsStore } from "@geond-agent/ui-workbench";

import type { VisualCaptureReviewState } from "./evidence-capture-export.js";

export const EVIDENCE_EXPORT_PREFERENCES_SETTINGS_KEY =
  "geond-agent.workbench.evidence-export-preferences";

export type EvidenceExportScopeMode = "all" | "attention" | "custom";

export interface EvidenceExportPreferences {
  readonly exportScopeMode: EvidenceExportScopeMode;
  readonly selectedSessionIds: readonly string[];
  readonly visualReview: VisualCaptureReviewState;
  readonly visualReviewUpdatedAt?: string;
}

export function defaultEvidenceExportPreferences(): EvidenceExportPreferences {
  return {
    exportScopeMode: "all",
    selectedSessionIds: [],
    visualReview: {
      explicitConsent: false,
      redactionReview: false,
      storagePathSelected: false,
      visibleContentReviewed: false
    }
  };
}

export async function loadEvidenceExportPreferences(
  settingsStore: LocalSettingsStore
): Promise<EvidenceExportPreferences> {
  const saved = await settingsStore.getItem(EVIDENCE_EXPORT_PREFERENCES_SETTINGS_KEY);
  if (!saved) {
    return defaultEvidenceExportPreferences();
  }

  try {
    return normalizeEvidenceExportPreferences(JSON.parse(saved) as unknown);
  } catch {
    return defaultEvidenceExportPreferences();
  }
}

export async function saveEvidenceExportPreferences(
  settingsStore: LocalSettingsStore,
  preferences: EvidenceExportPreferences
): Promise<EvidenceExportPreferences> {
  const normalized = normalizeEvidenceExportPreferences(preferences);
  await settingsStore.setItem(
    EVIDENCE_EXPORT_PREFERENCES_SETTINGS_KEY,
    JSON.stringify(normalized)
  );
  return normalized;
}

export function normalizeEvidenceExportPreferences(
  value: unknown
): EvidenceExportPreferences {
  if (!isRecord(value)) {
    return defaultEvidenceExportPreferences();
  }

  const defaults = defaultEvidenceExportPreferences();
  return {
    exportScopeMode: normalizeScopeMode(value.exportScopeMode),
    selectedSessionIds: normalizeStringList(value.selectedSessionIds),
    visualReview: normalizeVisualReview(value.visualReview),
    visualReviewUpdatedAt:
      typeof value.visualReviewUpdatedAt === "string" &&
      value.visualReviewUpdatedAt.trim().length > 0
        ? value.visualReviewUpdatedAt
        : defaults.visualReviewUpdatedAt
  };
}

function normalizeScopeMode(value: unknown): EvidenceExportScopeMode {
  return value === "attention" || value === "custom" ? value : "all";
}

function normalizeVisualReview(value: unknown): VisualCaptureReviewState {
  const record = isRecord(value) ? value : {};
  return {
    explicitConsent: record.explicitConsent === true,
    redactionReview: record.redactionReview === true,
    storagePathSelected: record.storagePathSelected === true,
    visibleContentReviewed: record.visibleContentReviewed === true
  };
}

function normalizeStringList(value: unknown): readonly string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(
    new Set(
      value
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter((item) => item.length > 0)
    )
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
