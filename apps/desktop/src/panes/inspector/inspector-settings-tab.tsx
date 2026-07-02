import type {
  UiI18n,
  WorkbenchCatalogOption,
  WorkbenchRuntimeSnapshot,
  WorkbenchSelectionReadiness,
  WorkbenchSessionDefaults,
  WorkbenchSettingsLabels
} from "@geond-agent/ui-workbench";
import type { ReactNode } from "react";

import { SettingsRow } from "../../components/workbench/settings-row.js";
import { SettingsSelect } from "../../components/workbench/settings-select.js";
import { SettingsKeyInput } from "../../components/workbench/settings-key-input.js";
import type { ClaudeCodeCliProbe } from "../../claude-runner.js";
import type { DesktopRunnerMode } from "../../demo-workbench.js";
import {
  createClaudeFirstRunChecklist,
  type FirstRunChecklistLevel
} from "../../lib/first-run-checklist.js";

export function InspectorSettingsTab({
  agentLanguageOptions,
  backendOptions,
  bridgeCommand,
  claudeCliProbe,
  composerEnterBehaviorOptions,
  followUpPolicyOptions,
  i18n,
  modelAliasOptions,
  permissionModeOptions,
  persistenceNotes,
  providerRouteOptions,
  reviewDeliveryOptions,
  routingModeOptions,
  runtimeSnapshot,
  runnerMode,
  selectionReadiness,
  sessionDefaults,
  settingsLabels,
  updateAgentResponseLanguage,
  updateRunnerMode,
  updateSessionDefaults,
  updateUiLanguage,
  workspacePath
}: {
  readonly agentLanguageOptions: readonly { readonly value: string; readonly label: string }[];
  readonly backendOptions: readonly WorkbenchCatalogOption[];
  readonly bridgeCommand: string;
  readonly claudeCliProbe?: ClaudeCodeCliProbe;
  readonly composerEnterBehaviorOptions: readonly { readonly value: string; readonly label: string }[];
  readonly followUpPolicyOptions: readonly { readonly value: string; readonly label: string }[];
  readonly i18n: UiI18n;
  readonly modelAliasOptions: readonly WorkbenchCatalogOption[];
  readonly permissionModeOptions: readonly { readonly value: string; readonly label: string }[];
  readonly persistenceNotes: readonly string[];
  readonly providerRouteOptions: readonly WorkbenchCatalogOption[];
  readonly reviewDeliveryOptions: readonly { readonly value: string; readonly label: string }[];
  readonly routingModeOptions: readonly { readonly value: string; readonly label: string }[];
  readonly runtimeSnapshot: WorkbenchRuntimeSnapshot;
  readonly runnerMode: DesktopRunnerMode;
  readonly selectionReadiness?: WorkbenchSelectionReadiness;
  readonly sessionDefaults: WorkbenchSessionDefaults;
  readonly settingsLabels: WorkbenchSettingsLabels;
  readonly updateAgentResponseLanguage: (language: string) => void;
  readonly updateRunnerMode: (mode: DesktopRunnerMode) => void;
  readonly updateSessionDefaults: (patch: Partial<WorkbenchSessionDefaults>) => void;
  readonly updateUiLanguage: (language: string) => void;
  readonly workspacePath?: string;
}) {
  const firstRunChecklist = createClaudeFirstRunChecklist({
    bridgeCommand,
    claudeCliProbe,
    i18n,
    modelAliasOptions,
    persistenceNotes,
    providerRouteOptions,
    runnerMode,
    selectionReadiness,
    sessionDefaults
  });

  return (
    <div className="settings-sections">
        <SettingsSection title={i18n.t("workbench.settings.firstRunSection")}>
          <SettingsRow
            label={i18n.t("workbench.settings.firstRunSection")}
            value={formatFirstRunLevel(i18n, firstRunChecklist.level)}
            detail={firstRunChecklist.summary}
          />
          {firstRunChecklist.items.map((item) => (
            <SettingsRow
              key={item.id}
              label={item.label}
              value={`${formatFirstRunLevel(i18n, item.level)} - ${item.value}`}
              detail={item.detail}
            />
          ))}
        </SettingsSection>

        <SettingsSection title={i18n.t("workbench.settings.languageSection")}>
          <SettingsSelect
            label={settingsLabels.fields.uiLanguage}
            value={runtimeSnapshot.languageSettings.uiLanguage}
            options={uiLanguageOptions}
            onChange={(value) => void updateUiLanguage(value)}
          />
          <SettingsSelect
            label={settingsLabels.fields.agentResponseLanguage}
            value={runtimeSnapshot.languageSettings.agentResponseLanguage}
            options={agentLanguageOptions}
            onChange={(value) => void updateAgentResponseLanguage(value)}
          />
        </SettingsSection>

        <SettingsSection title={i18n.t("workbench.settings.routingSection")}>
          <SettingsSelect
            label={i18n.t("workbench.runner.mode")}
            value={runnerMode}
            options={runnerModeOptions(i18n)}
            onChange={(value) =>
              void updateRunnerMode(
                value === "claude-live" || value === "codex-live" ? value : "fixture"
              )
            }
          />
          <SettingsSelect
            label={settingsLabels.fields.backend}
            value={sessionDefaults.defaultBackendAdapterId}
            options={backendOptions}
            onChange={(value) => void updateSessionDefaults({ defaultBackendAdapterId: value })}
          />
          <SettingsSelect
            label={settingsLabels.fields.providerRoute}
            value={sessionDefaults.defaultProviderRouteId}
            options={providerRouteOptions}
            onChange={(value) => void updateSessionDefaults({ defaultProviderRouteId: value })}
          />
          <SettingsSelect
            label={settingsLabels.fields.modelProfile}
            value={sessionDefaults.defaultModelAlias}
            options={modelAliasOptions}
            onChange={(value) => void updateSessionDefaults({ defaultModelAlias: value })}
          />
          <SettingsSelect
            label={settingsLabels.fields.routingMode}
            value={sessionDefaults.routingMode}
            options={routingModeOptions}
            onChange={(value) =>
              void updateSessionDefaults({ routingMode: value === "auto" ? "auto" : "manual" })
            }
          />
        </SettingsSection>

        <SettingsSection title={i18n.t("workbench.settings.inputSection")}>
          <SettingsSelect
            label={settingsLabels.fields.followUpPolicy}
            value={sessionDefaults.followUpPolicy}
            options={followUpPolicyOptions}
            onChange={(value) =>
              void updateSessionDefaults({
                followUpPolicy: value === "steer" || value === "interrupt" ? value : "queue"
              })
            }
          />
          <SettingsSelect
            label={settingsLabels.fields.composerEnterBehavior}
            value={sessionDefaults.composerEnterBehavior}
            options={composerEnterBehaviorOptions}
            onChange={(value) =>
              void updateSessionDefaults({
                composerEnterBehavior: value === "enter" ? "enter" : "modEnter"
              })
            }
          />
          <SettingsSelect
            label={settingsLabels.fields.reviewDelivery}
            value={sessionDefaults.reviewDelivery}
            options={reviewDeliveryOptions}
            onChange={(value) =>
              void updateSessionDefaults({
                reviewDelivery: value === "detached" ? "detached" : "inline"
              })
            }
          />
        </SettingsSection>

        <SettingsSection title={i18n.t("workbench.settings.safetySection")}>
          <SettingsSelect
            label={settingsLabels.fields.permissionMode}
            value={sessionDefaults.defaultPermissionMode}
            options={permissionModeOptions}
            onChange={(value) =>
              void updateSessionDefaults({
                defaultPermissionMode:
                  value === "default" || value === "acceptEdits" ? value : "plan"
              })
            }
          />
          <SettingsRow
            label={settingsLabels.fields.approvalPolicy}
            value={settingsLabels.values.approvalPolicyAskFirst}
          />
          <SettingsRow
            label={settingsLabels.fields.persistenceBoundary}
            value={settingsLabels.values.persistenceBoundaryLocalOnly}
            detail={persistenceNotes.join(" ")}
          />
        </SettingsSection>

        <SettingsSection title={i18n.t("workbench.settings.providerSection")}>
          <SettingsKeyInput
            workspacePath={workspacePath}
            i18n={i18n}
          />
        </SettingsSection>
    </div>
  );
}

function SettingsSection({
  children,
  title
}: {
  readonly children: ReactNode;
  readonly title: string;
}) {
  return (
    <section className="settings-section">
      <h3 className="settings-section-heading">{title}</h3>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

const uiLanguageOptions = [
  { value: "en", label: "English" },
  { value: "ko", label: "한국어" }
] as const;

function runnerModeOptions(i18n: UiI18n) {
  return [
    { value: "claude-live", label: i18n.t("workbench.runner.claudeLive") },
    { value: "codex-live", label: i18n.t("workbench.runner.codexLive") },
    { value: "fixture", label: i18n.t("workbench.runner.fixture") }
  ] as const;
}

function formatFirstRunLevel(i18n: UiI18n, level: FirstRunChecklistLevel): string {
  switch (level) {
    case "ready":
      return i18n.t("workbench.firstRun.levelReady");
    case "attention":
      return i18n.t("workbench.firstRun.levelAttention");
    case "blocked":
      return i18n.t("workbench.firstRun.levelBlocked");
  }
}
