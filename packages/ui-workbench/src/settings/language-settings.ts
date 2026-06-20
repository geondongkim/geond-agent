import {
  DEFAULT_UI_LANGUAGE,
  detectUiLanguage,
  normalizeUiLanguage,
  type SupportedUiLanguage
} from "../i18n/ui-language.js";
import type { LocalSettingsStore } from "./local-settings-store.js";

export const LANGUAGE_SETTINGS_KEY = "geond-agent.workbench.language";

export type AgentResponseLanguage = "system" | "en" | "ko" | (string & {});

export interface WorkbenchLanguageSettings {
  readonly uiLanguage: SupportedUiLanguage;
  readonly agentResponseLanguage: AgentResponseLanguage;
}

interface WorkbenchLanguageSettingsInput {
  readonly uiLanguage?: unknown;
  readonly agentResponseLanguage?: unknown;
}

export const DEFAULT_AGENT_RESPONSE_LANGUAGE: AgentResponseLanguage = "system";

export const DEFAULT_LANGUAGE_SETTINGS: WorkbenchLanguageSettings = {
  uiLanguage: DEFAULT_UI_LANGUAGE,
  agentResponseLanguage: DEFAULT_AGENT_RESPONSE_LANGUAGE
};

export function createDefaultLanguageSettings(
  systemLocales?: string | readonly string[]
): WorkbenchLanguageSettings {
  return {
    uiLanguage: detectUiLanguage(systemLocales),
    agentResponseLanguage: DEFAULT_AGENT_RESPONSE_LANGUAGE
  };
}

export function normalizeLanguageSettings(
  settings: WorkbenchLanguageSettingsInput | undefined,
  systemLocales?: string | readonly string[]
): WorkbenchLanguageSettings {
  const fallback = createDefaultLanguageSettings(systemLocales);

  return {
    uiLanguage: normalizeUiLanguage(settings?.uiLanguage ?? fallback.uiLanguage),
    agentResponseLanguage: normalizeAgentResponseLanguage(
      settings?.agentResponseLanguage ?? fallback.agentResponseLanguage
    )
  };
}

export function normalizeAgentResponseLanguage(value: unknown): AgentResponseLanguage {
  return typeof value === "string" && value.trim().length > 0
    ? value
    : DEFAULT_AGENT_RESPONSE_LANGUAGE;
}

export async function loadLanguageSettings(
  store: LocalSettingsStore,
  systemLocales?: string | readonly string[]
): Promise<WorkbenchLanguageSettings> {
  const rawValue = await store.getItem(LANGUAGE_SETTINGS_KEY);

  if (!rawValue) {
    return createDefaultLanguageSettings(systemLocales);
  }

  try {
    const parsed = JSON.parse(rawValue) as WorkbenchLanguageSettingsInput;
    return normalizeLanguageSettings(parsed, systemLocales);
  } catch {
    return createDefaultLanguageSettings(systemLocales);
  }
}

export async function saveLanguageSettings(
  store: LocalSettingsStore,
  settings: WorkbenchLanguageSettings
): Promise<void> {
  const normalized = normalizeLanguageSettings(settings);
  await store.setItem(LANGUAGE_SETTINGS_KEY, JSON.stringify(normalized));
}
