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
  Server,
  Settings,
  Terminal,
  Zap
} from "lucide-react";

import { Tabs, TabsList, TabsTrigger } from "../components/ui/tabs.js";
import type { ProjectedActiveSession } from "../lib/workbench-types.js";
import { formatProviderSummary } from "../lib/workbench-format.js";
import { InspectorBrowserTab } from "./inspector/inspector-browser-tab.js";
import { InspectorFilesTab } from "./inspector/inspector-files-tab.js";
import { InspectorSettingsTab } from "./inspector/inspector-settings-tab.js";
import { InspectorSideChatTab } from "./inspector/inspector-side-chat-tab.js";
import { InspectorTerminalTab } from "./inspector/inspector-terminal-tab.js";
import { InspectorReviewTab } from "./inspector/inspector-review-tab.js";
import type { DesktopRunnerMode } from "../demo-workbench.js";
import type { InspectorSessionReadModel } from "../lib/inspector-read-model.js";
import type { SideChatDraft } from "../lib/side-chat-drafts.js";

export function InspectorPane({
  activeExternalSession,
  activeRunMode,
  activeSession,
  attachFileContext,
  canFollowUpApprovals,
  agentLanguageOptions,
  backendOptions,
  bridgeCommand,
  composerEnterBehaviorOptions,
  drafts,
  enqueueSideChatDraft,
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
  removeSideChatDraft,
  reviewDeliveryOptions,
  resolveApproval,
  routingModeOptions,
  runtimeSnapshot,
  runnerMode,
  runnerBusy,
  runnerStatus,
  sessionDefaults,
  settingsLabels,
  setComposerPrompt,
  setInspectorTab,
  updateAgentResponseLanguage,
  updateRunnerMode,
  updateSessionDefaults,
  updateUiLanguage
}: {
  readonly activeExternalSession?: ProjectedActiveSession["externalSessions"][string];
  readonly activeRunMode?: DesktopRunnerMode;
  readonly activeSession?: ProjectedActiveSession;
  readonly attachFileContext: () => void;
  readonly canFollowUpApprovals: boolean;
  readonly agentLanguageOptions: readonly { readonly value: string; readonly label: string }[];
  readonly backendOptions: readonly WorkbenchCatalogOption[];
  readonly bridgeCommand: string;
  readonly ignoredRecordCount: number;
  readonly composerEnterBehaviorOptions: readonly { readonly value: string; readonly label: string }[];
  readonly drafts: readonly SideChatDraft[];
  readonly enqueueSideChatDraft: (text: string, sourceLabel?: string) => void;
  readonly followUpPolicyOptions: readonly { readonly value: string; readonly label: string }[];
  readonly i18n: UiI18n;
  readonly inspectorTab: string;
  readonly inspectorData?: InspectorSessionReadModel;
  readonly modelAliasOptions: readonly WorkbenchCatalogOption[];
  readonly permissionModeOptions: readonly { readonly value: string; readonly label: string }[];
  readonly persistenceNotes: readonly string[];
  readonly providerRouteOptions: readonly WorkbenchCatalogOption[];
  readonly providerSummary: string;
  readonly removeSideChatDraft: (draftId: string) => void;
  readonly reviewDeliveryOptions: readonly { readonly value: string; readonly label: string }[];
  readonly resolveApproval: (approvalId: string, decision: ApprovalDecision) => void;
  readonly routingModeOptions: readonly { readonly value: string; readonly label: string }[];
  readonly runtimeSnapshot: WorkbenchRuntimeSnapshot;
  readonly runnerBusy: boolean;
  readonly runnerMode: DesktopRunnerMode;
  readonly runnerStatus: string;
  readonly sessionDefaults: WorkbenchSessionDefaults;
  readonly settingsLabels: WorkbenchSettingsLabels;
  readonly setComposerPrompt: (prompt: string) => void;
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
          <div className="environment-metric">
            <Server size={14} />
            <div className="min-w-0">
              <p className="muted-meta">{i18n.t("workbench.workspacePanel.backend")}</p>
              <p className="truncate text-xs text-[color:var(--ink-soft)]">
                {sessionDefaults.defaultBackendAdapterId}
              </p>
            </div>
          </div>
          <div className="environment-metric">
            <Zap size={14} />
            <div className="min-w-0">
              <p className="muted-meta">{i18n.t("workbench.workspacePanel.provider")}</p>
              <p className="truncate text-xs text-[color:var(--ink-soft)]">
                {sessionDefaults.defaultProviderRouteId}
              </p>
            </div>
          </div>
        </div>
        <div className="mt-3 border-t border-white/[0.055] px-1 pt-3">
          <div className="flex items-center justify-between gap-3">
            <p className="muted-meta">{i18n.t("workbench.runner.mode")}</p>
            <span className={runnerBusy ? "status-pill status-warn" : "status-pill status-neutral"}>
              {runnerBusy
                ? i18n.t("workbench.runner.running")
                : runnerMode === "claude-live"
                  ? i18n.t("workbench.runner.claudeLive")
                  : i18n.t("workbench.runner.fixture")}
            </span>
          </div>
          <p className="mt-2 truncate font-mono text-[11px] leading-5 text-[color:var(--ink-soft)]">
            {runnerStatus ||
              (activeRunMode
                ? `${activeRunMode} ${i18n.t("workbench.runner.running")}`
                : i18n.t("workbench.runner.fixtureReady"))}
          </p>
        </div>
        <p className="mt-3 border-t border-white/[0.055] px-1 pt-3 font-mono text-[11px] leading-5 text-[color:var(--ink-soft)]">
          {formatProviderSummary(providerSummary)}
        </p>
      </div>

      <Tabs value={inspectorTab} onValueChange={setInspectorTab}>
        <div className="tool-tabs-shell">
          <p className="muted-meta">{i18n.t("workbench.workspacePanel.tools")}</p>
          <TabsList className="workspace-tabs tool-tab-grid">
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
        </div>

        <InspectorReviewTab
          activeExternalSession={activeExternalSession}
          activeSession={activeSession}
          bridgeCommand={bridgeCommand}
          canFollowUpApprovals={canFollowUpApprovals}
          enqueueSideChatDraft={enqueueSideChatDraft}
          i18n={i18n}
          ignoredRecordCount={ignoredRecordCount}
          inspectorData={inspectorData}
          providerRouteOptions={providerRouteOptions}
          resolveApproval={resolveApproval}
          runtimeSnapshot={runtimeSnapshot}
          sessionDefaults={sessionDefaults}
          setInspectorTab={setInspectorTab}
          updateSessionDefaults={updateSessionDefaults}
        />
        <InspectorTerminalTab
          activeSession={activeSession}
          commandOutputs={inspectorData?.commandOutputs}
          enqueueSideChatDraft={enqueueSideChatDraft}
          i18n={i18n}
        />
        <InspectorBrowserTab
          activeSession={activeSession}
          commandOutputs={inspectorData?.commandOutputs}
          enqueueSideChatDraft={enqueueSideChatDraft}
          i18n={i18n}
          setInspectorTab={setInspectorTab}
        />
        <InspectorFilesTab
          activeSession={activeSession}
          attachFileContext={attachFileContext}
          enqueueSideChatDraft={enqueueSideChatDraft}
          inspectorData={inspectorData}
          i18n={i18n}
        />
        <InspectorSideChatTab
          drafts={drafts}
          enqueueSideChatDraft={enqueueSideChatDraft}
          followUpPolicy={sessionDefaults.followUpPolicy}
          i18n={i18n}
          removeSideChatDraft={removeSideChatDraft}
          setComposerPrompt={setComposerPrompt}
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
