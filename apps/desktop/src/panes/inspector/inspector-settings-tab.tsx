import type {
  UiI18n,
  WorkbenchCatalogOption,
  WorkbenchRuntimeSnapshot,
  WorkbenchSessionDefaults,
  WorkbenchSettingsLabels
} from "@geond-agent/ui-workbench";

import { TabsContent } from "../../components/ui/tabs.js";
import { SettingsRow } from "../../components/workbench/settings-row.js";
import { SettingsSelect } from "../../components/workbench/settings-select.js";
import type { DesktopRunnerMode } from "../../demo-workbench.js";

export function InspectorSettingsTab({
  agentLanguageOptions,
  backendOptions,
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
  sessionDefaults,
  settingsLabels,
  updateAgentResponseLanguage,
  updateRunnerMode,
  updateSessionDefaults,
  updateUiLanguage
}: {
  readonly agentLanguageOptions: readonly { readonly value: string; readonly label: string }[];
  readonly backendOptions: readonly WorkbenchCatalogOption[];
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
  readonly sessionDefaults: WorkbenchSessionDefaults;
  readonly settingsLabels: WorkbenchSettingsLabels;
  readonly updateAgentResponseLanguage: (language: string) => void;
  readonly updateRunnerMode: (mode: DesktopRunnerMode) => void;
  readonly updateSessionDefaults: (patch: Partial<WorkbenchSessionDefaults>) => void;
  readonly updateUiLanguage: (language: string) => void;
}) {
  return (
    <TabsContent value="settings" className="border-0 bg-transparent p-0">
      <div className="space-y-2">
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
        <SettingsSelect
          label={i18n.t("workbench.runner.mode")}
          value={runnerMode}
          options={runnerModeOptions(i18n)}
          onChange={(value) =>
            void updateRunnerMode(value === "claude-live" ? "claude-live" : "fixture")
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
          onChange={(value) => void updateSessionDefaults({ routingMode: value === "auto" ? "auto" : "manual" })}
        />
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
        <SettingsSelect
          label={settingsLabels.fields.followUpPolicy}
          value={sessionDefaults.followUpPolicy}
          options={followUpPolicyOptions}
          onChange={(value) =>
            void updateSessionDefaults({
              followUpPolicy:
                value === "steer" || value === "interrupt" ? value : "queue"
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
        <SettingsRow
          label={settingsLabels.fields.approvalPolicy}
          value={settingsLabels.values.approvalPolicyAskFirst}
        />
        <SettingsRow
          label={settingsLabels.fields.persistenceBoundary}
          value={settingsLabels.values.persistenceBoundaryLocalOnly}
          detail={persistenceNotes.join(" ")}
        />
      </div>
    </TabsContent>
  );
}

const uiLanguageOptions = [
  { value: "en", label: "English" },
  { value: "ko", label: "한국어" }
] as const;

function runnerModeOptions(i18n: UiI18n) {
  return [
    { value: "claude-live", label: i18n.t("workbench.runner.claudeLive") },
    { value: "fixture", label: i18n.t("workbench.runner.fixture") }
  ] as const;
}
