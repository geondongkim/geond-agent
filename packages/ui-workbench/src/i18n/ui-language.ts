export const SUPPORTED_UI_LANGUAGES = ["en", "ko"] as const;
export type SupportedUiLanguage = (typeof SUPPORTED_UI_LANGUAGES)[number];

export const DEFAULT_UI_LANGUAGE: SupportedUiLanguage = "en";

export function isSupportedUiLanguage(value: string): value is SupportedUiLanguage {
  return SUPPORTED_UI_LANGUAGES.includes(value as SupportedUiLanguage);
}

export function normalizeUiLanguage(value: string | undefined | null): SupportedUiLanguage {
  if (!value) {
    return DEFAULT_UI_LANGUAGE;
  }

  const normalized = value.toLowerCase().split("-")[0];
  return normalized && isSupportedUiLanguage(normalized) ? normalized : DEFAULT_UI_LANGUAGE;
}

export function detectUiLanguage(
  systemLocales: string | readonly string[] | undefined | null
): SupportedUiLanguage {
  const locales =
    typeof systemLocales === "string" ? [systemLocales] : Array.from(systemLocales ?? []);

  for (const locale of locales) {
    const language = normalizeUiLanguage(locale);
    if (language !== DEFAULT_UI_LANGUAGE || locale.toLowerCase().startsWith(DEFAULT_UI_LANGUAGE)) {
      return language;
    }
  }

  return DEFAULT_UI_LANGUAGE;
}
