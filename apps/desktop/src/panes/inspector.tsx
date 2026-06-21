import type {
  ApprovalDecision,
  UiI18n,
  WorkbenchRuntimeSnapshot,
  WorkbenchSessionDefaults,
  WorkbenchSettingsLabels
} from "@geond-agent/ui-workbench";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs.js";
import { Button } from "../components/ui/button.js";
import { EmptyState } from "../components/workbench/empty-state.js";
import { SettingsRow } from "../components/workbench/settings-row.js";
import { SettingsSelect } from "../components/workbench/settings-select.js";
import { UsageMetric } from "../components/workbench/usage-metric.js";
import { cn } from "../lib/cn.js";
import type { ProjectedActiveSession } from "../lib/workbench-types.js";
import {
  approvalTone,
  formatAgentLanguageLabel,
  formatApprovalDecision,
  formatExternalSessionId,
  formatMessage,
  formatProviderSummary,
  formatRoutingModeLabel,
  formatStatusLabel,
  formatUsageCost,
  formatUsageNumber,
  formatUsageSourceLabel
} from "../lib/workbench-format.js";

export function InspectorPane({
  activeExternalSession,
  activeSession,
  agentLanguageOptions,
  bridgeCommand,
  ignoredRecordCount,
  i18n,
  inspectorTab,
  persistenceNotes,
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
  readonly bridgeCommand: string;
  readonly ignoredRecordCount: number;
  readonly i18n: UiI18n;
  readonly inspectorTab: string;
  readonly persistenceNotes: readonly string[];
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

        <TabsContent value="diff" className="border-0 bg-transparent p-0">
          {activeSession?.diffs.length ? (
            <div className="space-y-2">
              {activeSession.diffs.map((diff) => (
                <div key={diff.id} className="inspector-card">
                  <p className="text-sm font-semibold">{diff.title ?? diff.id}</p>
                  <p className="mt-1 text-xs leading-5 text-[color:var(--ink-soft)]">
                    {diff.summary}
                  </p>
                  <div className="mt-3 space-y-2">
                    {diff.files.map((file) => (
                      <div key={`${diff.id}:${file.path}`} className="rounded-md bg-[color:var(--panel-muted)] px-3 py-2 text-xs">
                        <p className="font-mono font-medium">{file.path}</p>
                        <p className="mt-1 text-[color:var(--ink-soft)]">
                          {file.changeKind} +{file.additions ?? 0} / -{file.deletions ?? 0}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState text={i18n.t("workbench.empty.diff")} />
          )}
        </TabsContent>

        <TabsContent value="terminal" className="border-0 bg-transparent p-0">
          {activeSession?.commandOutputs.length ? (
            <div className="space-y-2">
              {activeSession.commandOutputs.map((output) => (
                <div key={output.id} className="terminal-card">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-mono text-xs uppercase text-[color:var(--shell-soft)]">
                      {output.id}
                    </p>
                    <p className="font-mono text-[11px] text-[color:var(--inverse-soft)]">
                      {formatStatusLabel(i18n, output.status)}
                      {output.exitCode !== undefined ? ` / ${output.exitCode}` : ""}
                    </p>
                  </div>
                  <pre className="mt-3 whitespace-pre-wrap font-mono text-xs leading-6 text-[color:var(--inverse-soft)]">
                    {output.preview}
                  </pre>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState text={i18n.t("workbench.empty.terminal")} />
          )}
        </TabsContent>

        <TabsContent value="approvals" className="border-0 bg-transparent p-0">
          {activeSession?.approvals.length ? (
            <div className="space-y-2">
              {activeSession.approvals.map((approval) => (
                <div key={approval.id} className="inspector-card">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold">{approval.title}</p>
                      <p className="mt-1 text-xs leading-5 text-[color:var(--ink-soft)]">
                        {approval.subject ?? approval.reason ?? approval.kind}
                      </p>
                    </div>
                    <span className={cn("status-pill", approvalTone(approval.status, approval.decision))}>
                      {formatStatusLabel(i18n, approval.status)}
                      {approval.decision
                        ? ` / ${formatApprovalDecision(i18n, approval.decision)}`
                        : ""}
                    </span>
                  </div>
                  {approval.status === "pending" ? (
                    <div className="mt-3 flex flex-wrap justify-end gap-2">
                      <Button
                        variant="outline"
                        onClick={() => void resolveApproval(approval.id, "rejected")}
                      >
                        {i18n.t("workbench.approvals.reject")}
                      </Button>
                      <Button onClick={() => void resolveApproval(approval.id, "approved")}>
                        {i18n.t("workbench.approvals.approve")}
                      </Button>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <EmptyState text={i18n.t("workbench.empty.approvals")} />
          )}
        </TabsContent>

        <TabsContent value="usage" className="border-0 bg-transparent p-0">
          {activeSession?.usageReports.length ? (
            <div className="space-y-2">
              {activeSession.usageReports.map((usage) => (
                <div key={usage.id} className="inspector-card">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">
                        {usage.model ?? i18n.t("workbench.usage.title")}
                      </p>
                      <p className="mt-1 text-xs leading-5 text-[color:var(--ink-soft)]">
                        {i18n.t("workbench.usage.source")}: {formatUsageSourceLabel(i18n, usage.source)}
                      </p>
                    </div>
                    <span className="status-pill status-neutral">
                      {formatUsageCost(usage.costUsd)}
                    </span>
                  </div>
                  <div className="usage-grid mt-3">
                    <UsageMetric
                      label={i18n.t("workbench.usage.input")}
                      value={formatUsageNumber(usage.inputTokens)}
                    />
                    <UsageMetric
                      label={i18n.t("workbench.usage.output")}
                      value={formatUsageNumber(usage.outputTokens)}
                    />
                    <UsageMetric
                      label={i18n.t("workbench.usage.cacheRead")}
                      value={formatUsageNumber(usage.cacheReadInputTokens)}
                    />
                    <UsageMetric
                      label={i18n.t("workbench.usage.cacheCreate")}
                      value={formatUsageNumber(usage.cacheCreationInputTokens)}
                    />
                    <UsageMetric
                      label={i18n.t("workbench.usage.context")}
                      value={formatUsageNumber(usage.contextWindow)}
                    />
                    <UsageMetric
                      label={i18n.t("workbench.usage.maxOutput")}
                      value={formatUsageNumber(usage.maxOutputTokens)}
                    />
                  </div>
                  {usage.serviceTier ? (
                    <p className="mt-3 text-xs text-[color:var(--ink-soft)]">
                      {i18n.t("workbench.usage.serviceTier")}: {usage.serviceTier}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <EmptyState text={i18n.t("workbench.empty.usage")} />
          )}
        </TabsContent>

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

        <TabsContent value="selection" className="border-0 bg-transparent p-0">
          {activeSession?.selection ? (
            <div className="space-y-2">
              <SettingsRow
                label={i18n.t("workbench.selection.backend")}
                value={activeSession.selection.backendAdapter?.label ?? activeSession.selection.backendAdapterId}
              />
              <SettingsRow
                label={i18n.t("workbench.selection.provider")}
                value={activeSession.selection.providerRoute?.label ?? activeSession.selection.providerRouteId ?? i18n.t("workbench.status.unknown")}
              />
              <SettingsRow
                label={i18n.t("workbench.selection.model")}
                value={activeSession.selection.modelProfile?.label ?? activeSession.selection.modelProfileId ?? i18n.t("workbench.status.unknown")}
              />
              <SettingsRow
                label={i18n.t("workbench.selection.routingMode")}
                value={formatRoutingModeLabel(i18n, activeSession.selection.routingMode)}
              />
              <SettingsRow
                label={i18n.t("workbench.selection.uiLanguage")}
                value={activeSession.selection.uiLanguage ?? runtimeSnapshot.languageSettings.uiLanguage}
              />
              <SettingsRow
                label={i18n.t("workbench.selection.agentLanguage")}
                value={
                  formatAgentLanguageLabel(
                    i18n,
                    activeSession.selection.agentResponseLanguage ??
                      runtimeSnapshot.languageSettings.agentResponseLanguage
                  )
                }
              />
              <SettingsRow
                label={i18n.t("workbench.selection.externalSession")}
                value={
                  activeExternalSession
                    ? formatExternalSessionId(activeExternalSession.externalSessionId)
                    : i18n.t("workbench.status.unknown")
                }
              />
              <SettingsRow
                label={i18n.t("workbench.selection.warnings")}
                value={
                  activeSession.selection.capabilityWarnings?.length
                    ? activeSession.selection.capabilityWarnings.join(" | ")
                    : `${bridgeCommand || "claude"} --bare -p --verbose --output-format stream-json`
                }
                detail={formatMessage(i18n.t("workbench.selection.ignoredSanitizedRecords"), {
                  count: ignoredRecordCount
                })}
              />
            </div>
          ) : (
            <EmptyState text={i18n.t("workbench.empty.selection")} />
          )}
        </TabsContent>
      </Tabs>
    </aside>
  );
}

const uiLanguageOptions = [
  { value: "en", label: "English" },
  { value: "ko", label: "한국어" }
] as const;

const backendOptions = [
  { value: "claude-code.external-cli-acp", label: "Claude Code external CLI/ACP" }
] as const;

const providerRouteOptions = [
  { value: "zai.anthropic-compatible", label: "Z.ai Anthropic-compatible" },
  { value: "zai.openai-compatible-coding", label: "Z.ai OpenAI-compatible coding" }
] as const;

const modelAliasOptions = [
  { value: "sonnet", label: "sonnet -> GLM 4.7" },
  { value: "opus", label: "opus -> GLM 5.2" },
  { value: "haiku", label: "haiku -> GLM 4.7" },
  { value: "auto", label: "auto" }
] as const;
