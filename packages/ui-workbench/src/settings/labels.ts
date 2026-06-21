import type { UiI18n } from "../i18n/messages.js";
import type { WorkbenchPermissionMode } from "./session-defaults.js";
import type { RoutingMode } from "../workbench/selection.js";

export interface WorkbenchSettingsLabels {
  readonly title: string;
  readonly fields: {
    readonly uiLanguage: string;
    readonly agentResponseLanguage: string;
    readonly backend: string;
    readonly providerRoute: string;
    readonly modelProfile: string;
    readonly routingMode: string;
    readonly permissionMode: string;
    readonly approvalPolicy: string;
    readonly persistenceBoundary: string;
  };
  readonly values: {
    readonly manualRouting: string;
    readonly autoRouting: string;
    readonly permissionModePlan: string;
    readonly permissionModeDefault: string;
    readonly permissionModeAcceptEdits: string;
    readonly approvalPolicyAskFirst: string;
    readonly persistenceBoundaryLocalOnly: string;
  };
}

export function createWorkbenchSettingsLabels(i18n: UiI18n): WorkbenchSettingsLabels {
  return {
    title: i18n.t("settings.selection.title"),
    fields: {
      uiLanguage: i18n.t("settings.language.uiLanguage"),
      agentResponseLanguage: i18n.t("settings.language.agentLanguage"),
      backend: i18n.t("settings.selection.backend"),
      providerRoute: i18n.t("settings.selection.provider"),
      modelProfile: i18n.t("settings.selection.model"),
      routingMode: i18n.t("settings.selection.routingMode"),
      permissionMode: i18n.t("settings.selection.permissionMode"),
      approvalPolicy: i18n.t("settings.selection.approvalPolicy"),
      persistenceBoundary: i18n.t("settings.selection.persistence")
    },
    values: {
      manualRouting: i18n.t("workbench.selection.manual"),
      autoRouting: i18n.t("workbench.selection.auto"),
      permissionModePlan: i18n.t("settings.selection.permissionMode.plan"),
      permissionModeDefault: i18n.t("settings.selection.permissionMode.default"),
      permissionModeAcceptEdits: i18n.t("settings.selection.permissionMode.acceptEdits"),
      approvalPolicyAskFirst: i18n.t("settings.selection.approvalPolicy.askFirst"),
      persistenceBoundaryLocalOnly: i18n.t("settings.selection.persistence.localOnly")
    }
  };
}

export function getRoutingModeLabel(i18n: UiI18n, routingMode: RoutingMode): string {
  return routingMode === "auto"
    ? i18n.t("workbench.selection.auto")
    : i18n.t("workbench.selection.manual");
}

export function getPermissionModeLabel(
  i18n: UiI18n,
  permissionMode: WorkbenchPermissionMode
): string {
  switch (permissionMode) {
    case "default":
      return i18n.t("settings.selection.permissionMode.default");
    case "acceptEdits":
      return i18n.t("settings.selection.permissionMode.acceptEdits");
    case "plan":
      return i18n.t("settings.selection.permissionMode.plan");
  }
}
