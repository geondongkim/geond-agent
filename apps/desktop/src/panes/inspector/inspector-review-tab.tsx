import type { KeyboardEvent } from "react";
import { MessageSquarePlus } from "lucide-react";

import type {
  ApprovalDecision,
  UiI18n,
  WorkbenchApprovalSnapshot,
  WorkbenchRuntimeSnapshot
} from "@geond-agent/ui-workbench";

import { Button } from "../../components/ui/button.js";
import { TabsContent } from "../../components/ui/tabs.js";
import { EmptyState } from "../../components/workbench/empty-state.js";
import { SettingsRow } from "../../components/workbench/settings-row.js";
import { UsageMetric } from "../../components/workbench/usage-metric.js";
import { cn } from "../../lib/cn.js";
import {
  approvalTone,
  formatAgentLanguageLabel,
  formatApprovalDecision,
  formatExternalSessionId,
  formatMessage,
  formatRoutingModeLabel,
  formatStatusLabel,
  formatUsageCost,
  formatUsageNumber,
  formatUsageSourceLabel
} from "../../lib/workbench-format.js";
import type { InspectorSessionReadModel } from "../../lib/inspector-read-model.js";
import {
  createApprovalFollowUpDraft,
  createDiffFollowUpDraft
} from "../../lib/inspector-follow-up.js";
import type { ProjectedActiveSession } from "../../lib/workbench-types.js";

export function InspectorReviewTab({
  activeExternalSession,
  activeSession,
  bridgeCommand,
  canFollowUpApprovals,
  enqueueSideChatDraft,
  i18n,
  ignoredRecordCount,
  inspectorData,
  resolveApproval,
  runtimeSnapshot,
  setInspectorTab
}: {
  readonly activeExternalSession?: ProjectedActiveSession["externalSessions"][string];
  readonly activeSession?: ProjectedActiveSession;
  readonly bridgeCommand: string;
  readonly canFollowUpApprovals: boolean;
  readonly enqueueSideChatDraft: (text: string, sourceLabel?: string) => void;
  readonly i18n: UiI18n;
  readonly ignoredRecordCount: number;
  readonly inspectorData?: InspectorSessionReadModel;
  readonly resolveApproval: (approvalId: string, decision: ApprovalDecision) => void;
  readonly runtimeSnapshot: WorkbenchRuntimeSnapshot;
  readonly setInspectorTab: (tab: string) => void;
}) {
  if (!activeSession) {
    return (
      <TabsContent value="review" className="border-0 bg-transparent p-0">
        <EmptyState text={i18n.t("workbench.timeline.empty")} />
      </TabsContent>
    );
  }

  const diffs = inspectorData?.diffs ?? activeSession.diffs;
  const usageReports = inspectorData?.usageReports ?? activeSession.usageReports;
  const runAttempts = inspectorData?.runAttempts ?? activeSession.runAttempts;
  const latestUsage = usageReports.at(-1);

  return (
    <TabsContent value="review" className="border-0 bg-transparent p-0">
      <div className="space-y-3">
        <section className="review-section">
          <div className="review-section-heading">
            <h3>{i18n.t("workbench.runAttempts.title")}</h3>
            <span className="metric-pill">{runAttempts.length}</span>
          </div>
          {runAttempts.length ? (
            <div className="space-y-2">
              {runAttempts.map((attempt) => (
                <div key={attempt.id} className="inspector-card">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">
                        {attempt.modelProfileId ?? attempt.mode}
                      </p>
                      <p className="mt-1 text-xs leading-5 text-[color:var(--ink-soft)]">
                        {i18n.t("workbench.runAttempts.mode")}: {attempt.mode}
                        {attempt.externalSessionId
                          ? ` / ${i18n.t("workbench.runAttempts.resume")}: ${formatExternalSessionId(
                              attempt.externalSessionId
                            )}`
                          : ""}
                      </p>
                    </div>
                    <span className={cn("status-pill", runAttemptTone(attempt.status))}>
                      {formatStatusLabel(i18n, attempt.status)}
                    </span>
                  </div>
                  <div className="usage-grid mt-3">
                    <UsageMetric
                      label={i18n.t("workbench.runAttempts.events")}
                      value={formatUsageNumber(i18n, attempt.eventCount)}
                    />
                    <UsageMetric
                      label={i18n.t("workbench.runAttempts.ignored")}
                      value={formatUsageNumber(i18n, attempt.ignoredRecordCount)}
                    />
                    <UsageMetric
                      label={i18n.t("workbench.runAttempts.parseWarnings")}
                      value={formatUsageNumber(i18n, attempt.parseWarningCount)}
                    />
                    <UsageMetric
                      label={i18n.t("workbench.runAttempts.exitCode")}
                      value={formatUsageNumber(i18n, attempt.exitCode)}
                    />
                  </div>
                  <div className="mt-3 space-y-2 text-xs leading-5 text-[color:var(--ink-soft)]">
                    {attempt.startedAt ? (
                      <p>
                        {i18n.t("workbench.runAttempts.started")}: {formatAttemptTime(attempt.startedAt)}
                      </p>
                    ) : null}
                    {attempt.finishedAt ? (
                      <p>
                        {i18n.t("workbench.runAttempts.finished")}: {formatAttemptTime(attempt.finishedAt)}
                      </p>
                    ) : null}
                    {attempt.promptSummary ? (
                      <p>
                        {i18n.t("workbench.runAttempts.prompt")}: {attempt.promptSummary}
                      </p>
                    ) : null}
                    {attempt.commandPreview ? (
                      <p className="font-mono text-[color:var(--inverse-soft)]">
                        {i18n.t("workbench.runAttempts.command")}: {attempt.commandPreview}
                      </p>
                    ) : null}
                    {attempt.errorMessage ? (
                      <p className="text-[color:var(--danger)]">{attempt.errorMessage}</p>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState text={i18n.t("workbench.empty.runAttempts")} />
          )}
        </section>

        <section className="review-section">
          <div className="review-section-heading">
            <h3>{i18n.t("workbench.approvals.title")}</h3>
            <span className="metric-pill">
              {activeSession.approvals.filter((approval) => approval.status === "pending").length}
            </span>
          </div>
          {activeSession.approvals.length ? (
            <div className="space-y-2">
              {activeSession.approvals.map((approval) => (
                <div
                  key={approval.id}
                  className="inspector-card focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--accent)]"
                  role="group"
                  tabIndex={approval.status === "pending" ? 0 : undefined}
                  aria-label={formatMessage(i18n.t("workbench.approvals.ariaLabel"), {
                    title: approval.title
                  })}
                  onKeyDown={(event) => {
                    handleApprovalKeyDown(event, approval, resolveApproval);
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold">{approval.title}</p>
                        <span className={cn("status-pill", getApprovalRisk(i18n, approval).className)}>
                          {getApprovalRisk(i18n, approval).label}
                        </span>
                      </div>
                      <p className="mt-1 text-xs leading-5 text-[color:var(--ink-soft)]">
                        {approval.subject ?? approval.reason ?? approval.kind}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "status-pill",
                        approvalTone(approval.status, approval.decision)
                      )}
                    >
                      {formatStatusLabel(i18n, approval.status)}
                      {approval.decision
                        ? ` / ${formatApprovalDecision(i18n, approval.decision)}`
                        : ""}
                    </span>
                  </div>
                  {approval.status === "pending" ? (
                    <div className="mt-3 flex flex-wrap justify-end gap-2">
                      <Button
                        variant="ghost"
                        className="gap-2"
                        onClick={() =>
                          enqueueSideChatDraft(
                            createApprovalFollowUpDraft(approval),
                            approval.title
                          )
                        }
                      >
                        <MessageSquarePlus size={14} />
                        {i18n.t("workbench.followUp.queueReview")}
                      </Button>
                      {approval.kind === "command" ? (
                        <Button variant="ghost" onClick={() => setInspectorTab("terminal")}>
                          {i18n.t("workbench.approvals.viewTerminal")}
                        </Button>
                      ) : null}
                      <Button
                        variant="outline"
                        onClick={() => void resolveApproval(approval.id, "rejected")}
                      >
                        {i18n.t("workbench.approvals.reject")}
                      </Button>
                      <Button onClick={() => void resolveApproval(approval.id, "approved")}>
                        {canFollowUpApprovals
                          ? i18n.t("workbench.approvals.approveAndResume")
                          : i18n.t("workbench.approvals.approve")}
                      </Button>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <EmptyState text={i18n.t("workbench.empty.approvals")} />
          )}
        </section>

        <section className="review-section">
          <div className="review-section-heading">
            <h3>{i18n.t("workbench.diff.title")}</h3>
            <span className="metric-pill">{diffs.length}</span>
          </div>
          {diffs.length ? (
            <div className="space-y-2">
              {diffs.map((diff) => (
                <div key={diff.id} className="inspector-card">
                  <p className="text-sm font-semibold">{diff.title ?? diff.id}</p>
                  <p className="mt-1 text-xs leading-5 text-[color:var(--ink-soft)]">
                    {diff.summary}
                  </p>
                  <div className="mt-3 space-y-2">
                    {diff.files.map((file) => (
                      <div
                        key={`${diff.id}:${file.path}`}
                        className="rounded-md bg-[color:var(--panel-muted)] px-3 py-2 text-xs"
                      >
                        <p className="truncate font-mono font-medium">{file.path}</p>
                        <p className="mt-1 text-[color:var(--ink-soft)]">
                          {file.changeKind} +{file.additions ?? 0} / -{file.deletions ?? 0}
                        </p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 flex justify-end">
                    <Button
                      variant="outline"
                      className="gap-2"
                      onClick={() =>
                        enqueueSideChatDraft(createDiffFollowUpDraft(diff), diff.title ?? diff.id)
                      }
                    >
                      <MessageSquarePlus size={14} />
                      {i18n.t("workbench.followUp.queueReview")}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState text={i18n.t("workbench.empty.diff")} />
          )}
        </section>

        <section className="review-section">
          <div className="review-section-heading">
            <h3>{i18n.t("workbench.usage.title")}</h3>
            <span className="status-pill status-neutral">
              {latestUsage
                ? formatUsageCost(i18n, latestUsage.costUsd)
                : i18n.t("workbench.status.notAvailable")}
            </span>
          </div>
          {latestUsage ? (
            <div className="inspector-card">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">
                    {latestUsage.model ?? i18n.t("workbench.usage.title")}
                  </p>
                  <p className="mt-1 text-xs text-[color:var(--ink-soft)]">
                    {i18n.t("workbench.usage.source")}:{" "}
                    {formatUsageSourceLabel(i18n, latestUsage.source)}
                  </p>
                </div>
              </div>
              <div className="usage-grid mt-3">
                <UsageMetric
                  label={i18n.t("workbench.usage.input")}
                  value={formatUsageNumber(i18n, latestUsage.inputTokens)}
                />
                <UsageMetric
                  label={i18n.t("workbench.usage.output")}
                  value={formatUsageNumber(i18n, latestUsage.outputTokens)}
                />
                <UsageMetric
                  label={i18n.t("workbench.usage.context")}
                  value={formatUsageNumber(i18n, latestUsage.contextWindow)}
                />
                <UsageMetric
                  label={i18n.t("workbench.usage.maxOutput")}
                  value={formatUsageNumber(i18n, latestUsage.maxOutputTokens)}
                />
              </div>
            </div>
          ) : (
            <EmptyState text={i18n.t("workbench.empty.usage")} />
          )}
        </section>

        <section className="review-section">
          <div className="review-section-heading">
            <h3>{i18n.t("workbench.selection.title")}</h3>
          </div>
          {activeSession.selection ? (
            <div className="space-y-2">
              <SettingsRow
                label={i18n.t("workbench.selection.backend")}
                value={
                  activeSession.selection.backendAdapter?.label ??
                  activeSession.selection.backendAdapterId
                }
              />
              <SettingsRow
                label={i18n.t("workbench.selection.provider")}
                value={
                  activeSession.selection.providerRoute?.label ??
                  activeSession.selection.providerRouteId ??
                  i18n.t("workbench.status.unknown")
                }
              />
              <SettingsRow
                label={i18n.t("workbench.selection.model")}
                value={
                  activeSession.selection.modelProfile?.label ??
                  activeSession.selection.modelProfileId ??
                  i18n.t("workbench.status.unknown")
                }
              />
              <SettingsRow
                label={i18n.t("workbench.selection.routingMode")}
                value={formatRoutingModeLabel(i18n, activeSession.selection.routingMode)}
              />
              <SettingsRow
                label={i18n.t("workbench.selection.agentLanguage")}
                value={formatAgentLanguageLabel(
                  i18n,
                  activeSession.selection.agentResponseLanguage ??
                    runtimeSnapshot.languageSettings.agentResponseLanguage
                )}
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
        </section>
      </div>
    </TabsContent>
  );
}

function runAttemptTone(status: string): string {
  switch (status) {
    case "running":
      return "status-warn";
    case "succeeded":
      return "status-ok";
    case "failed":
      return "status-danger";
    case "cancelled":
      return "status-neutral";
    default:
      return "status-neutral";
  }
}

function formatAttemptTime(value: string): string {
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) {
    return value;
  }

  return new Intl.DateTimeFormat("en", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  }).format(parsed);
}

function getApprovalRisk(
  i18n: UiI18n,
  approval: WorkbenchApprovalSnapshot
): { readonly label: string; readonly className: string } {
  switch (approval.kind) {
    case "command":
      return {
        label: i18n.t("workbench.approvals.riskHigh"),
        className: "status-danger"
      };
    case "diff":
    case "filesystem":
    case "network":
      return {
        label: i18n.t("workbench.approvals.riskMedium"),
        className: "status-warn"
      };
    case "mcp":
      return {
        label: i18n.t("workbench.approvals.riskLow"),
        className: "status-neutral"
      };
  }
}

function handleApprovalKeyDown(
  event: KeyboardEvent<HTMLDivElement>,
  approval: WorkbenchApprovalSnapshot,
  resolveApproval: (approvalId: string, decision: ApprovalDecision) => void
): void {
  if (approval.status !== "pending") {
    return;
  }

  if (event.key === "Enter") {
    event.preventDefault();
    resolveApproval(approval.id, "approved");
    return;
  }

  if (event.key === "Escape" || event.key === "Backspace") {
    event.preventDefault();
    resolveApproval(approval.id, "rejected");
  }
}
