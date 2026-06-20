import type { SupportedUiLanguage } from "../i18n/ui-language.js";
import { isSupportedUiLanguage, normalizeUiLanguage } from "../i18n/ui-language.js";
import {
  loadLanguageSettings,
  normalizeLanguageSettings,
  saveLanguageSettings,
  type WorkbenchLanguageSettings
} from "./language-settings.js";
import { createMemoryLocalSettingsStore } from "./local-settings-store.js";

/**
 * Compile-time / runtime-free fixture for the UI language persistence boundary.
 *
 * This package's `lint`, `test`, and `build` scripts run `tsc --noEmit`, so the
 * type assertions below are enforced at compile time. The pure helpers would
 * also hold at runtime if invoked, but they require no test runner.
 *
 * The fixture proves three things:
 *   1. Corrupted local settings recover to a supported UI language (`en`/`ko`).
 *   2. Saving after recovery stores only a supported `uiLanguage`.
 *   3. `agentResponseLanguage` stays independent of the UI language.
 */

type AssertEqual<X, Y> =
  (<T>() => T extends X ? 1 : 2) extends (<T>() => T extends Y ? 1 : 2) ? true : false;

const _supportedSetIsExactlyEnKo: AssertEqual<SupportedUiLanguage, "en" | "ko"> = true;

const _persistedUiLanguageIsSupported: AssertEqual<
  WorkbenchLanguageSettings["uiLanguage"],
  SupportedUiLanguage
> = true;

export const CORRUPT_UI_LANGUAGE_FIXTURES = [
  "fr",
  "ja",
  "zh-CN",
  "EN",
  "ko-KR",
  "",
  "   ",
  0,
  123,
  true,
  false,
  null,
  undefined,
  [],
  ["ko"],
  { locale: "ko" }
] as const;

function assertSupportedUiLanguage(value: SupportedUiLanguage): SupportedUiLanguage {
  if (!isSupportedUiLanguage(value)) {
    throw new Error(`Unsupported UI language leaked through normalization: ${String(value)}`);
  }
  return value;
}

export function recoverCorruptedUiLanguage(value: unknown): SupportedUiLanguage {
  return assertSupportedUiLanguage(normalizeUiLanguage(value));
}

export function verifyCorruptedSettingsRecover(): void {
  for (const value of CORRUPT_UI_LANGUAGE_FIXTURES) {
    assertSupportedUiLanguage(normalizeUiLanguage(value));
  }
}

export async function verifySaveStoresOnlySupportedUiLanguage(): Promise<void> {
  for (const value of CORRUPT_UI_LANGUAGE_FIXTURES) {
    const store = createMemoryLocalSettingsStore();
    const recovered = normalizeLanguageSettings({
      uiLanguage: value,
      agentResponseLanguage: "fr"
    });
    await saveLanguageSettings(store, recovered);
    const reloaded = await loadLanguageSettings(store);

    assertSupportedUiLanguage(reloaded.uiLanguage);

    if (reloaded.agentResponseLanguage !== "fr") {
      throw new Error("agentResponseLanguage was collapsed into the UI language during save");
    }
  }
}
