import { useMemo } from "react";

import {
  createBackendAdapterOptions,
  createModelProfileOptions,
  createProviderRouteOptions,
  createWorkbenchSettingsLabels,
  type UiI18n,
  type WorkbenchSelectionCatalog
} from "@geond-agent/ui-workbench";

export function useWorkbenchOptions(
  i18n: UiI18n,
  selectionCatalog: WorkbenchSelectionCatalog
) {
  const settingsLabels = useMemo(() => createWorkbenchSettingsLabels(i18n), [i18n]);
  const backendOptions = useMemo(
    () => createBackendAdapterOptions(selectionCatalog),
    [selectionCatalog]
  );
  const providerRouteOptions = useMemo(
    () => createProviderRouteOptions(selectionCatalog),
    [selectionCatalog]
  );
  const modelAliasOptions = useMemo(
    () => createModelProfileOptions(selectionCatalog),
    [selectionCatalog]
  );
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
  const permissionModeOptions = useMemo(
    () => [
      { value: "plan", label: i18n.t("settings.selection.permissionMode.plan") },
      { value: "default", label: i18n.t("settings.selection.permissionMode.default") },
      { value: "acceptEdits", label: i18n.t("settings.selection.permissionMode.acceptEdits") }
    ],
    [i18n]
  );
  const followUpPolicyOptions = useMemo(
    () => [
      { value: "queue", label: settingsLabels.values.followUpQueue },
      { value: "steer", label: settingsLabels.values.followUpSteer },
      { value: "interrupt", label: settingsLabels.values.followUpInterrupt }
    ],
    [settingsLabels]
  );
  const composerEnterBehaviorOptions = useMemo(
    () => [
      { value: "modEnter", label: settingsLabels.values.composerEnterModEnter },
      { value: "enter", label: settingsLabels.values.composerEnterEnter }
    ],
    [settingsLabels]
  );
  const reviewDeliveryOptions = useMemo(
    () => [
      { value: "inline", label: settingsLabels.values.reviewDeliveryInline },
      { value: "detached", label: settingsLabels.values.reviewDeliveryDetached }
    ],
    [settingsLabels]
  );

  return {
    agentLanguageOptions,
    backendOptions,
    composerEnterBehaviorOptions,
    followUpPolicyOptions,
    modelAliasOptions,
    permissionModeOptions,
    providerRouteOptions,
    reviewDeliveryOptions,
    routingModeOptions,
    settingsLabels
  };
}
