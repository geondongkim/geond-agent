import type {
  UiI18n,
  WorkbenchCatalogOption,
  WorkbenchSelectionReadiness,
  WorkbenchSessionDefaults
} from "@geond-agent/ui-workbench";

export type FirstRunChecklistLevel = "ready" | "attention" | "blocked";

export interface FirstRunChecklistItem {
  readonly id: string;
  readonly label: string;
  readonly level: FirstRunChecklistLevel;
  readonly value: string;
  readonly detail: string;
}

export interface FirstRunChecklist {
  readonly level: FirstRunChecklistLevel;
  readonly summary: string;
  readonly items: readonly FirstRunChecklistItem[];
}

export function createClaudeFirstRunChecklist({
  bridgeCommand,
  i18n,
  modelAliasOptions,
  persistenceNotes,
  providerRouteOptions,
  runnerMode,
  selectionReadiness,
  sessionDefaults
}: {
  readonly bridgeCommand: string;
  readonly i18n: UiI18n;
  readonly modelAliasOptions: readonly WorkbenchCatalogOption[];
  readonly persistenceNotes: readonly string[];
  readonly providerRouteOptions: readonly WorkbenchCatalogOption[];
  readonly runnerMode: "claude-live" | "fixture";
  readonly selectionReadiness?: WorkbenchSelectionReadiness;
  readonly sessionDefaults: WorkbenchSessionDefaults;
}): FirstRunChecklist {
  const providerRoute = findOption(providerRouteOptions, sessionDefaults.defaultProviderRouteId);
  const modelAlias = findOption(modelAliasOptions, sessionDefaults.defaultModelAlias);
  const providerReadiness = selectionReadiness?.items.find((item) => item.id === "provider-route");
  const modelReadiness = selectionReadiness?.items.find((item) => item.id === "model-profile");
  const routingReadiness = selectionReadiness?.items.find((item) => item.id === "routing-mode");
  const items: FirstRunChecklistItem[] = [
    {
      id: "runner-mode",
      label: i18n.t("workbench.firstRun.runnerMode"),
      level: runnerMode === "claude-live" ? "ready" : "attention",
      value:
        runnerMode === "claude-live"
          ? i18n.t("workbench.runner.claudeLive")
          : i18n.t("workbench.runner.fixture"),
      detail:
        runnerMode === "claude-live"
          ? i18n.t("workbench.firstRun.runnerModeLive")
          : i18n.t("workbench.firstRun.runnerModeFixture")
    },
    {
      id: "bridge-command",
      label: i18n.t("workbench.firstRun.bridgeCommand"),
      level: bridgeCommand.trim().length > 0 ? "ready" : "blocked",
      value: bridgeCommand.trim() || i18n.t("workbench.firstRun.missing"),
      detail:
        bridgeCommand.trim().length > 0
          ? i18n.t("workbench.firstRun.bridgeCommandReady")
          : i18n.t("workbench.firstRun.bridgeCommandMissing")
    },
    {
      id: "provider-route",
      label: i18n.t("workbench.firstRun.providerRoute"),
      level: providerReadiness
        ? normalizeReadinessLevel(providerReadiness.level)
        : providerRoute
          ? "ready"
          : "blocked",
      value: providerRoute?.label ?? sessionDefaults.defaultProviderRouteId,
      detail:
        providerReadiness?.reason ??
        providerRoute?.detail ??
        i18n.t("workbench.firstRun.providerRouteMissing")
    },
    {
      id: "model-profile",
      label: i18n.t("workbench.firstRun.modelProfile"),
      level: modelReadiness
        ? normalizeReadinessLevel(modelReadiness.level)
        : modelAlias
          ? "ready"
          : "blocked",
      value: modelAlias?.label ?? sessionDefaults.defaultModelAlias,
      detail:
        modelReadiness?.reason ??
        modelAlias?.detail ??
        i18n.t("workbench.firstRun.modelProfileMissing")
    },
    {
      id: "routing-mode",
      label: i18n.t("settings.selection.routingMode"),
      level: routingReadiness
        ? normalizeReadinessLevel(routingReadiness.level)
        : sessionDefaults.routingMode === "manual"
          ? "ready"
          : "attention",
      value: sessionDefaults.routingMode,
      detail:
        routingReadiness?.reason ??
        (sessionDefaults.routingMode === "manual"
          ? i18n.t("workbench.firstRun.routingModeManual")
          : i18n.t("workbench.firstRun.routingModeAuto"))
    },
    {
      id: "permission-mode",
      label: i18n.t("workbench.firstRun.permissionMode"),
      level: sessionDefaults.defaultPermissionMode === "plan" ? "ready" : "attention",
      value: sessionDefaults.defaultPermissionMode,
      detail:
        sessionDefaults.defaultPermissionMode === "plan"
          ? i18n.t("workbench.firstRun.permissionModePlan")
          : i18n.t("workbench.firstRun.permissionModeAttention")
    },
    {
      id: "persistence-boundary",
      label: i18n.t("workbench.firstRun.persistence"),
      level: persistenceNotes.length > 0 ? "ready" : "attention",
      value:
        persistenceNotes.length > 0
          ? i18n.t("workbench.firstRun.persistenceReady")
          : i18n.t("workbench.firstRun.persistenceMissing"),
      detail:
        persistenceNotes[0] ??
        i18n.t("workbench.firstRun.persistenceMissingDetail")
    }
  ];

  const level = summarizeChecklistLevel(items);
  return {
    level,
    summary: summaryForLevel(i18n, level),
    items
  };
}

function normalizeReadinessLevel(
  level: WorkbenchSelectionReadiness["items"][number]["level"]
): FirstRunChecklistLevel {
  switch (level) {
    case "ready":
      return "ready";
    case "blocked":
      return "blocked";
    case "attention":
    case "unknown":
      return "attention";
  }
}

function findOption(
  options: readonly WorkbenchCatalogOption[],
  value: string
): WorkbenchCatalogOption | undefined {
  return options.find((option) => option.value === value);
}

function summarizeChecklistLevel(items: readonly FirstRunChecklistItem[]): FirstRunChecklistLevel {
  if (items.some((item) => item.level === "blocked")) {
    return "blocked";
  }
  if (items.some((item) => item.level === "attention")) {
    return "attention";
  }
  return "ready";
}

function summaryForLevel(i18n: UiI18n, level: FirstRunChecklistLevel): string {
  switch (level) {
    case "ready":
      return i18n.t("workbench.firstRun.summaryReady");
    case "attention":
      return i18n.t("workbench.firstRun.summaryAttention");
    case "blocked":
      return i18n.t("workbench.firstRun.summaryBlocked");
  }
}
