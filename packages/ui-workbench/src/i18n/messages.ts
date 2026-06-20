import { DEFAULT_UI_LANGUAGE, type SupportedUiLanguage } from "./ui-language.js";

export type UiMessageKey =
  | "settings.language.title"
  | "settings.language.uiLanguage"
  | "settings.language.agentLanguage"
  | "settings.language.saved"
  | "settings.language.systemDefault"
  | "workbench.sessionSidebar.title"
  | "workbench.plan.title"
  | "workbench.terminal.title"
  | "workbench.diff.title";

export type UiMessageCatalog = Readonly<Record<UiMessageKey, string>>;

export const uiMessages: Readonly<Record<SupportedUiLanguage, UiMessageCatalog>> = {
  en: {
    "settings.language.title": "Language",
    "settings.language.uiLanguage": "UI language",
    "settings.language.agentLanguage": "Agent response language",
    "settings.language.saved": "Language settings saved",
    "settings.language.systemDefault": "Use system language",
    "workbench.sessionSidebar.title": "Sessions",
    "workbench.plan.title": "Plan",
    "workbench.terminal.title": "Terminal",
    "workbench.diff.title": "Diff"
  },
  ko: {
    "settings.language.title": "언어",
    "settings.language.uiLanguage": "UI 언어",
    "settings.language.agentLanguage": "에이전트 응답 언어",
    "settings.language.saved": "언어 설정이 저장되었습니다",
    "settings.language.systemDefault": "시스템 언어 사용",
    "workbench.sessionSidebar.title": "세션",
    "workbench.plan.title": "계획",
    "workbench.terminal.title": "터미널",
    "workbench.diff.title": "변경 사항"
  }
};

export function translateUiMessage(
  language: SupportedUiLanguage,
  key: UiMessageKey
): string {
  return uiMessages[language]?.[key] ?? uiMessages[DEFAULT_UI_LANGUAGE][key];
}

export interface UiI18n {
  readonly language: SupportedUiLanguage;
  readonly t: (key: UiMessageKey) => string;
}

export function createUiI18n(language: SupportedUiLanguage): UiI18n {
  return {
    language,
    t: (key) => translateUiMessage(language, key)
  };
}
