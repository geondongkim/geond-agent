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
import { EmptyState } from "../components/workbench/empty-state.js";
import type { ProjectedActiveSession } from "../lib/workbench-types.js";
import { formatContextKindLabel, formatProviderSummary } from "../lib/workbench-format.js";
import { InspectorSettingsTab } from "./inspector/inspector-settings-tab.js";
import { InspectorTerminalTab } from "./inspector/inspector-terminal-tab.js";
import { InspectorReviewTab } from "./inspector/inspector-review-tab.js";
import type { DesktopRunnerMode } from "../demo-workbench.js";
import type { InspectorSessionReadModel } from "../lib/inspector-read-model.js";

export function InspectorPane({
  activeExternalSession,
  activeSession,
  canFollowUpApprovals,
  agentLanguageOptions,
  backendOptions,
  bridgeCommand,
  composerEnterBehaviorOptions,
  followUpPolicyOptions,
  ignoredRecordCount,
  i18n,
  inspectorTab,
  inspectorData,
  modelAliasOptions,
  permissionModeOptions,
  persistenceNotes,
  providerRouteOptions,
  providerSummary,
  reviewDeliveryOptions,
  resolveApproval,
  routingModeOptions,
  runtimeSnapshot,
  runnerMode,
  sessionDefaults,
  settingsLabels,
  setInspectorTab,
  updateAgentResponseLanguage,
  updateRunnerMode,
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
  readonly composerEnterBehaviorOptions: readonly { readonly value: string; readonly label: string }[];
  readonly followUpPolicyOptions: readonly { readonly value: string; readonly label: string }[];
  readonly i18n: UiI18n;
  readonly inspectorTab: string;
  readonly inspectorData?: InspectorSessionReadModel;
  readonly modelAliasOptions: readonly WorkbenchCatalogOption[];
  readonly permissionModeOptions: readonly { readonly value: string; readonly label: string }[];
  readonly persistenceNotes: readonly string[];
  readonly providerRouteOptions: readonly WorkbenchCatalogOption[];
  readonly providerSummary: string;
  readonly reviewDeliveryOptions: readonly { readonly value: string; readonly label: string }[];
  readonly resolveApproval: (approvalId: string, decision: ApprovalDecision) => void;
  readonly routingModeOptions: readonly { readonly value: string; readonly label: string }[];
  readonly runtimeSnapshot: WorkbenchRuntimeSnapshot;
  readonly runnerMode: DesktopRunnerMode;
  readonly sessionDefaults: WorkbenchSessionDefaults;
  readonly settingsLabels: WorkbenchSettingsLabels;
  readonly setInspectorTab: (tab: string) => void;
  readonly updateAgentResponseLanguage: (language: string) => void;
  readonly updateRunnerMode: (mode: DesktopRunnerMode) => void;
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
          inspectorData={inspectorData}
          resolveApproval={resolveApproval}
          runtimeSnapshot={runtimeSnapshot}
          setInspectorTab={setInspectorTab}
        />
        <InspectorTerminalTab
          activeSession={activeSession}
          commandOutputs={inspectorData?.commandOutputs}
          i18n={i18n}
        />
        <WorkspacePlaceholderTab
          value="browser"
          title={i18n.t("workbench.workspacePanel.browserTitle")}
          detail={i18n.t("workbench.workspacePanel.browserDetail")}
        />
        <InspectorFilesTab
          activeSession={activeSession}
          contextAttachments={inspectorData?.contextAttachments}
          i18n={i18n}
        />
        <WorkspacePlaceholderTab
          value="chat"
          title={i18n.t("workbench.workspacePanel.chatTitle")}
          detail={i18n.t("workbench.workspacePanel.chatDetail")}
        />
        <InspectorSettingsTab
          agentLanguageOptions={agentLanguageOptions}
          backendOptions={backendOptions}
          composerEnterBehaviorOptions={composerEnterBehaviorOptions}
          followUpPolicyOptions={followUpPolicyOptions}
          i18n={i18n}
          modelAliasOptions={modelAliasOptions}
          permissionModeOptions={permissionModeOptions}
          persistenceNotes={persistenceNotes}
          providerRouteOptions={providerRouteOptions}
          reviewDeliveryOptions={reviewDeliveryOptions}
          routingModeOptions={routingModeOptions}
          runtimeSnapshot={runtimeSnapshot}
          runnerMode={runnerMode}
          sessionDefaults={sessionDefaults}
          settingsLabels={settingsLabels}
          updateAgentResponseLanguage={updateAgentResponseLanguage}
          updateRunnerMode={updateRunnerMode}
          updateSessionDefaults={updateSessionDefaults}
          updateUiLanguage={updateUiLanguage}
        />
      </Tabs>
    </aside>
  );
}

function InspectorFilesTab({
  activeSession,
  contextAttachments,
  i18n
}: {
  readonly activeSession?: ProjectedActiveSession;
  readonly contextAttachments?: InspectorSessionReadModel["contextAttachments"];
  readonly i18n: UiI18n;
}) {
  const attachments = contextAttachments ?? activeSession?.contextAttachments ?? [];

  return (
    <TabsContent value="files" className="border-0 bg-transparent p-0">
      <div className="inspector-card">
        <p className="text-sm font-semibold">{i18n.t("workbench.context.title")}</p>
        <p className="mt-2 text-xs leading-5 text-[color:var(--ink-soft)]">
          {i18n.t("workbench.workspacePanel.filesDetail")}
        </p>
      </div>
      {attachments.length ? (
        <div className="mt-3 space-y-3">
          {attachments.map((attachment) => (
            <article key={attachment.id} className="inspector-card">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="muted-meta">
                    {formatContextKindLabel(i18n, attachment.kind)}
                  </p>
                  <h3 className="truncate text-sm font-semibold">{attachment.title}</h3>
                </div>
                <span className="status-pill status-neutral">
                  {i18n.t("workbench.context.metadataOnly")}
                </span>
              </div>
              <dl className="mt-3 space-y-2 text-xs">
                {attachment.path ? (
                  <ContextDetail
                    label={i18n.t("workbench.context.path")}
                    value={attachment.path}
                  />
                ) : null}
                {attachment.range ? (
                  <ContextDetail
                    label={i18n.t("workbench.context.range")}
                    value={formatContextRange(attachment.range)}
                  />
                ) : null}
                <ContextDetail
                  label={i18n.t("workbench.context.provenance")}
                  value={attachment.provenance}
                />
                {attachment.summary ? (
                  <ContextDetail
                    label={i18n.t("workbench.context.summary")}
                    value={attachment.summary}
                  />
                ) : null}
              </dl>
            </article>
          ))}
        </div>
      ) : (
        <div className="mt-3">
          <EmptyState text={i18n.t("workbench.context.empty")} />
        </div>
      )}
    </TabsContent>
  );
}

function ContextDetail({
  label,
  value
}: {
  readonly label: string;
  readonly value: string;
}) {
  return (
    <div>
      <dt className="muted-meta">{label}</dt>
      <dd className="mt-1 break-words font-mono text-[color:var(--ink-soft)]">{value}</dd>
    </div>
  );
}

function formatContextRange(
  range: ProjectedActiveSession["contextAttachments"][number]["range"]
): string {
  if (!range) {
    return "";
  }

  const start = `${range.startLine}${range.startColumn ? `:${range.startColumn}` : ""}`;
  const end = range.endLine
    ? `${range.endLine}${range.endColumn ? `:${range.endColumn}` : ""}`
    : undefined;

  return end ? `L${start}-L${end}` : `L${start}`;
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
