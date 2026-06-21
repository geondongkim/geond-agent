import { useMemo } from "react";

import {
  createWorkbenchSettingsLabels,
  type UiI18n
} from "@geond-agent/ui-workbench";

export function useWorkbenchOptions(i18n: UiI18n) {
  const settingsLabels = useMemo(() => createWorkbenchSettingsLabels(i18n), [i18n]);
  const agentLanguageOptions = useMemo(
    () => [
      { value: "system", label: i18n.t("workbench.language.system") },
      { value: "en", label: "English" },
      { value: "ko", label: "한국어" }
    ],
    [i18n]
  );
  const routingModeOptions = useMemo(
    () => [
      { value: "manual", label: i18n.t("workbench.selection.manual") },
      { value: "auto", label: i18n.t("workbench.selection.auto") }
    ],
    [i18n]
  );

  return {
    agentLanguageOptions,
    routingModeOptions,
    settingsLabels
  };
}
