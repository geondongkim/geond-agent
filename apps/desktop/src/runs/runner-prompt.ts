import type { UiI18n } from "@geond-agent/ui-workbench";

import type { DesktopRunnerMode } from "../demo-workbench.js";

export function createRunnerPrompt(
  mode: DesktopRunnerMode,
  prompt: string,
  i18n: UiI18n
): string {
  const trimmed = prompt.trim();
  if (trimmed.length > 0) {
    return trimmed;
  }

  return mode === "claude-live"
    ? i18n.t("workbench.composer.livePlaceholder")
    : i18n.t("workbench.composer.placeholder");
}
