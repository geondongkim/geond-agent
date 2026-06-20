import { createUiI18n, type UiI18n } from "../i18n/index.js";
import {
  loadLanguageSettings,
  normalizeAgentResponseLanguage,
  normalizeLanguageSettings,
  saveLanguageSettings,
  type AgentResponseLanguage,
  type WorkbenchLanguageSettings
} from "../settings/language-settings.js";
import type { LocalSettingsStore } from "../settings/local-settings-store.js";

export interface WorkbenchRuntimeOptions {
  readonly settingsStore: LocalSettingsStore;
  readonly systemLocales?: string | readonly string[];
}

export interface WorkbenchRuntimeSnapshot {
  readonly languageSettings: WorkbenchLanguageSettings;
  readonly i18n: UiI18n;
}

export interface WorkbenchRuntime {
  readonly getSnapshot: () => WorkbenchRuntimeSnapshot;
  readonly setUiLanguage: (language: string) => Promise<WorkbenchRuntimeSnapshot>;
  readonly setAgentResponseLanguage: (
    language: AgentResponseLanguage
  ) => Promise<WorkbenchRuntimeSnapshot>;
}

export async function createWorkbenchRuntime(
  options: WorkbenchRuntimeOptions
): Promise<WorkbenchRuntime> {
  let languageSettings = await loadLanguageSettings(options.settingsStore, options.systemLocales);

  const createSnapshot = (): WorkbenchRuntimeSnapshot => ({
    languageSettings,
    i18n: createUiI18n(languageSettings.uiLanguage)
  });

  const persist = async (
    nextSettings: WorkbenchLanguageSettings
  ): Promise<WorkbenchRuntimeSnapshot> => {
    languageSettings = normalizeLanguageSettings(nextSettings, options.systemLocales);
    await saveLanguageSettings(options.settingsStore, languageSettings);
    return createSnapshot();
  };

  return {
    getSnapshot: createSnapshot,
    setUiLanguage: (language) =>
      persist(
        normalizeLanguageSettings(
          {
            ...languageSettings,
            uiLanguage: language
          },
          options.systemLocales
        )
      ),
    setAgentResponseLanguage: (language) =>
      persist({
        ...languageSettings,
        agentResponseLanguage: normalizeAgentResponseLanguage(language)
      })
  };
}
