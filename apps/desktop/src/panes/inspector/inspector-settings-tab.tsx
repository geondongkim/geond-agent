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

export function InspectorSettingsTab({
  agentLanguageOptions,
  backendOptions,
  i18n,
  modelAliasOptions,
  permissionModeOptions,
  persistenceNotes,
  providerRouteOptions,
  routingModeOptions,
  runtimeSnapshot,
  sessionDefaults,
  settingsLabels,
  updateAgentResponseLanguage,
  updateSessionDefaults,
  updateUiLanguage
}: {
  readonly agentLanguageOptions: readonly { readonly value: string; readonly label: string }[];
  readonly backendOptions: readonly WorkbenchCatalogOption[];
  readonly i18n: UiI18n;
  readonly modelAliasOptions: readonly WorkbenchCatalogOption[];
  readonly permissionModeOptions: readonly { readonly value: string; readonly label: string }[];
  readonly persistenceNotes: readonly string[];
  readonly providerRouteOptions: readonly WorkbenchCatalogOption[];
  readonly routingModeOptions: readonly { readonly value: string; readonly label: string }[];
  readonly runtimeSnapshot: WorkbenchRuntimeSnapshot;
  readonly sessionDefaults: WorkbenchSessionDefaults;
  readonly settingsLabels: WorkbenchSettingsLabels;
  readonly updateAgentResponseLanguage: (language: string) => void;
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
