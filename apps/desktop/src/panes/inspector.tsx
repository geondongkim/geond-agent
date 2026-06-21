import type {
  ApprovalDecision,
  UiI18n,
  WorkbenchRuntimeSnapshot,
  WorkbenchSessionDefaults,
  WorkbenchSettingsLabels,
  WorkbenchCatalogOption
} from "@geond-agent/ui-workbench";

import { Tabs, TabsList, TabsTrigger } from "../components/ui/tabs.js";
import type { ProjectedActiveSession } from "../lib/workbench-types.js";
import { formatProviderSummary } from "../lib/workbench-format.js";
import { InspectorApprovalsTab } from "./inspector/inspector-approvals-tab.js";
import { InspectorDiffTab } from "./inspector/inspector-diff-tab.js";
import { InspectorSelectionTab } from "./inspector/inspector-selection-tab.js";
import { InspectorSettingsTab } from "./inspector/inspector-settings-tab.js";
import { InspectorTerminalTab } from "./inspector/inspector-terminal-tab.js";
import { InspectorUsageTab } from "./inspector/inspector-usage-tab.js";

export function InspectorPane({
  activeExternalSession,
  activeSession,
  agentLanguageOptions,
  backendOptions,
  bridgeCommand,
  ignoredRecordCount,
  i18n,
  inspectorTab,
  modelAliasOptions,
  permissionModeOptions,
  persistenceNotes,
  providerRouteOptions,
  providerSummary,
  resolveApproval,
  routingModeOptions,
  runtimeSnapshot,
  sessionDefaults,
  settingsLabels,
  setInspectorTab,
  updateAgentResponseLanguage,
  updateSessionDefaults,
  updateUiLanguage
}: {
  readonly activeExternalSession?: ProjectedActiveSession["externalSessions"][string];
  readonly activeSession?: ProjectedActiveSession;
  readonly agentLanguageOptions: readonly { readonly value: string; readonly label: string }[];
  readonly backendOptions: readonly WorkbenchCatalogOption[];
  readonly bridgeCommand: string;
  readonly ignoredRecordCount: number;
  readonly i18n: UiI18n;
  readonly inspectorTab: string;
  readonly modelAliasOptions: readonly WorkbenchCatalogOption[];
  readonly permissionModeOptions: readonly { readonly value: string; readonly label: string }[];
  readonly persistenceNotes: readonly string[];
  readonly providerRouteOptions: readonly WorkbenchCatalogOption[];
  readonly providerSummary: string;
  readonly resolveApproval: (approvalId: string, decision: ApprovalDecision) => void;
  readonly routingModeOptions: readonly { readonly value: string; readonly label: string }[];
  readonly runtimeSnapshot: WorkbenchRuntimeSnapshot;
  readonly sessionDefaults: WorkbenchSessionDefaults;
  readonly settingsLabels: WorkbenchSettingsLabels;
  readonly setInspectorTab: (tab: string) => void;
  readonly updateAgentResponseLanguage: (language: string) => void;
  readonly updateSessionDefaults: (patch: Partial<WorkbenchSessionDefaults>) => void;
  readonly updateUiLanguage: (language: string) => void;
}) {
  return (
    <aside className="inspector-surface">
      <div className="mb-3 space-y-2">
        <div className="flex items-center justify-between gap-3">
          <h2 className="panel-title">{i18n.t("workbench.inspector.title")}</h2>
          <span className="font-mono text-[10px] text-[color:var(--ink-muted)]">
            {sessionDefaults.defaultModelAlias}
          </span>
        </div>
        <p className="rounded-md border border-[color:var(--border)] bg-[color:var(--panel)] px-3 py-2 font-mono text-[11px] leading-5 text-[color:var(--ink-soft)]">
          {formatProviderSummary(providerSummary)}
        </p>
      </div>

      <Tabs value={inspectorTab} onValueChange={setInspectorTab}>
        <TabsList className="border-[color:var(--border)] bg-[color:var(--panel)]">
          <TabsTrigger value="diff">{i18n.t("workbench.inspector.diff")}</TabsTrigger>
          <TabsTrigger value="terminal">{i18n.t("workbench.inspector.terminal")}</TabsTrigger>
          <TabsTrigger value="approvals">{i18n.t("workbench.inspector.approvals")}</TabsTrigger>
          <TabsTrigger value="usage">{i18n.t("workbench.inspector.usage")}</TabsTrigger>
          <TabsTrigger value="settings">{i18n.t("workbench.inspector.settings")}</TabsTrigger>
          <TabsTrigger value="selection">{i18n.t("workbench.inspector.selection")}</TabsTrigger>
        </TabsList>

        <InspectorDiffTab activeSession={activeSession} i18n={i18n} />
        <InspectorTerminalTab activeSession={activeSession} i18n={i18n} />
        <InspectorApprovalsTab
          activeSession={activeSession}
          i18n={i18n}
          permissionMode={sessionDefaults.defaultPermissionMode}
          resolveApproval={resolveApproval}
          setInspectorTab={setInspectorTab}
        />
        <InspectorUsageTab activeSession={activeSession} i18n={i18n} />
        <InspectorSettingsTab
          agentLanguageOptions={agentLanguageOptions}
          backendOptions={backendOptions}
          i18n={i18n}
          modelAliasOptions={modelAliasOptions}
          permissionModeOptions={permissionModeOptions}
          persistenceNotes={persistenceNotes}
          providerRouteOptions={providerRouteOptions}
          routingModeOptions={routingModeOptions}
          runtimeSnapshot={runtimeSnapshot}
          sessionDefaults={sessionDefaults}
          settingsLabels={settingsLabels}
          updateAgentResponseLanguage={updateAgentResponseLanguage}
          updateSessionDefaults={updateSessionDefaults}
          updateUiLanguage={updateUiLanguage}
        />
        <InspectorSelectionTab
          activeExternalSession={activeExternalSession}
          activeSession={activeSession}
          bridgeCommand={bridgeCommand}
          ignoredRecordCount={ignoredRecordCount}
          i18n={i18n}
          runtimeSnapshot={runtimeSnapshot}
        />
      </Tabs>
    </aside>
  );
}
