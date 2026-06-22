import type {
  ApprovalDecision,
  UiI18n,
  WorkbenchRuntimeSnapshot,
  WorkbenchSessionDefaults,
  WorkbenchSettingsLabels,
  WorkbenchCatalogOption
} from "@geond-agent/ui-workbench";
import {
  ClipboardCheck,
  Files,
  Globe2,
  MessageSquare,
  Settings,
  Terminal
} from "lucide-react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs.js";
import type { ProjectedActiveSession } from "../lib/workbench-types.js";
import { formatProviderSummary } from "../lib/workbench-format.js";
import { InspectorSettingsTab } from "./inspector/inspector-settings-tab.js";
import { InspectorTerminalTab } from "./inspector/inspector-terminal-tab.js";
import { InspectorReviewTab } from "./inspector/inspector-review-tab.js";

export function InspectorPane({
  activeExternalSession,
  activeSession,
  canFollowUpApprovals,
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
  readonly canFollowUpApprovals: boolean;
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
      <div className="environment-card">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="panel-title">{i18n.t("workbench.workspacePanel.title")}</h2>
            <p className="mt-1 truncate text-sm font-semibold">
              {activeSession?.workspacePath ?? i18n.t("workbench.workspace.all")}
            </p>
          </div>
          <span className="status-pill status-neutral">
            {sessionDefaults.defaultModelAlias}
          </span>
        </div>
        <div className="environment-grid">
          <div>
            <p className="muted-meta">{i18n.t("workbench.workspacePanel.backend")}</p>
            <p className="truncate text-xs text-[color:var(--ink-soft)]">
              {sessionDefaults.defaultBackendAdapterId}
            </p>
          </div>
          <div>
            <p className="muted-meta">{i18n.t("workbench.workspacePanel.provider")}</p>
            <p className="truncate text-xs text-[color:var(--ink-soft)]">
              {sessionDefaults.defaultProviderRouteId}
            </p>
          </div>
        </div>
        <p className="mt-3 rounded-md border border-[color:var(--border)] bg-[color:var(--panel)] px-3 py-2 font-mono text-[11px] leading-5 text-[color:var(--ink-soft)]">
          {formatProviderSummary(providerSummary)}
        </p>
      </div>

      <Tabs value={inspectorTab} onValueChange={setInspectorTab}>
        <TabsList className="workspace-tabs border-[color:var(--border)] bg-[color:var(--panel)]">
          <TabsTrigger value="review" className="workspace-tab">
            <ClipboardCheck size={14} />
            {i18n.t("workbench.workspacePanel.review")}
          </TabsTrigger>
          <TabsTrigger value="terminal" className="workspace-tab">
            <Terminal size={14} />
            {i18n.t("workbench.workspacePanel.terminal")}
          </TabsTrigger>
          <TabsTrigger value="browser" className="workspace-tab">
            <Globe2 size={14} />
            {i18n.t("workbench.workspacePanel.browser")}
          </TabsTrigger>
          <TabsTrigger value="files" className="workspace-tab">
            <Files size={14} />
            {i18n.t("workbench.workspacePanel.files")}
          </TabsTrigger>
          <TabsTrigger value="chat" className="workspace-tab">
            <MessageSquare size={14} />
            {i18n.t("workbench.workspacePanel.chat")}
          </TabsTrigger>
          <TabsTrigger value="settings" className="workspace-tab">
            <Settings size={14} />
            {i18n.t("workbench.workspacePanel.settings")}
          </TabsTrigger>
        </TabsList>

        <InspectorReviewTab
          activeExternalSession={activeExternalSession}
          activeSession={activeSession}
          bridgeCommand={bridgeCommand}
          canFollowUpApprovals={canFollowUpApprovals}
          i18n={i18n}
          ignoredRecordCount={ignoredRecordCount}
          resolveApproval={resolveApproval}
          runtimeSnapshot={runtimeSnapshot}
          setInspectorTab={setInspectorTab}
        />
        <InspectorTerminalTab activeSession={activeSession} i18n={i18n} />
        <WorkspacePlaceholderTab
          value="browser"
          title={i18n.t("workbench.workspacePanel.browserTitle")}
          detail={i18n.t("workbench.workspacePanel.browserDetail")}
        />
        <WorkspacePlaceholderTab
          value="files"
          title={i18n.t("workbench.workspacePanel.filesTitle")}
          detail={i18n.t("workbench.workspacePanel.filesDetail")}
        />
        <WorkspacePlaceholderTab
          value="chat"
          title={i18n.t("workbench.workspacePanel.chatTitle")}
          detail={i18n.t("workbench.workspacePanel.chatDetail")}
        />
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
      </Tabs>
    </aside>
  );
}

function WorkspacePlaceholderTab({
  detail,
  title,
  value
}: {
  readonly detail: string;
  readonly title: string;
  readonly value: string;
}) {
  return (
    <TabsContent value={value} className="border-0 bg-transparent p-0">
      <div className="inspector-card">
        <p className="text-sm font-semibold">{title}</p>
        <p className="mt-2 text-xs leading-5 text-[color:var(--ink-soft)]">{detail}</p>
      </div>
    </TabsContent>
  );
}
