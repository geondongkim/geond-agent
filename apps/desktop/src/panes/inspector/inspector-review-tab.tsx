import type { KeyboardEvent } from "react";
import { MessageSquarePlus, Terminal } from "lucide-react";

import type {
  ApprovalDecision,
  UiI18n,
  WorkbenchApprovalSnapshot,
  WorkbenchCatalogOption,
  WorkbenchRuntimeSnapshot,
  WorkbenchSessionDefaults
} from "@geond-agent/ui-workbench";
import { deriveRunAttemptStreamQuality } from "@geond-agent/ui-workbench";

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
  formatLiveRunGuidanceDetail,
  formatLiveRunGuidanceLabel,
  formatMessage,
  formatIssueSuggestedActionLabel,
  formatRetryableLabel,
  formatRouteHealthLabel,
  formatRoutingModeLabel,
  formatSelectionReadinessDetail,
  formatSelectionReadinessLevelLabel,
  formatStatusLabel,
  formatRunAttemptTriggerLabel,
  formatStreamQualityLabel,
  formatUsageCost,
  formatUsageNumber,
  formatUsageSourceLabel,
  liveRunGuidanceTone
} from "../../lib/workbench-format.js";
import type { InspectorSessionReadModel } from "../../lib/inspector-read-model.js";
import {
  createApprovalFollowUpDraft,
  createDiffFollowUpDraft,
  createRunAttemptFollowUpDraft,
  createSessionReviewFollowUpDraft
} from "../../lib/inspector-follow-up.js";
import {
  findAdvisoryProviderRouteFallback,
  findCurrentProviderRouteOption,
  shouldOfferProviderRouteFallback
} from "../../lib/provider-route-advisory.js";
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
  providerRouteOptions,
  resolveApproval,
  runtimeSnapshot,
  sessionDefaults,
  setInspectorTab,
  updateSessionDefaults
}: {
  readonly activeExternalSession?: ProjectedActiveSession["externalSessions"][string];
  readonly activeSession?: ProjectedActiveSession;
  readonly bridgeCommand: string;
  readonly canFollowUpApprovals: boolean;
  readonly enqueueSideChatDraft: (text: string, sourceLabel?: string) => void;
  readonly i18n: UiI18n;
  readonly ignoredRecordCount: number;
  readonly inspectorData?: InspectorSessionReadModel;
  readonly providerRouteOptions: readonly WorkbenchCatalogOption[];
  readonly resolveApproval: (approvalId: string, decision: ApprovalDecision) => void;
  readonly runtimeSnapshot: WorkbenchRuntimeSnapshot;
  readonly sessionDefaults: WorkbenchSessionDefaults;
  readonly setInspectorTab: (tab: string) => void;
  readonly updateSessionDefaults: (patch: Partial<WorkbenchSessionDefaults>) => void;
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
  const runnerIssues = activeSession.runnerIssues;
  const providerRouteHealth = activeSession.providerRouteHealth;
  const liveRunContinuity = activeSession.liveRunContinuity;
  const latestUsage = usageReports.at(-1);
  const currentProviderRoute = findCurrentProviderRouteOption(
    providerRouteOptions,
    sessionDefaults.defaultProviderRouteId
  );

  return (
    <TabsContent value="review" className="border-0 bg-transparent p-0">
      <div className="space-y-3">
        <section className="review-section">
          <div className="review-section-heading">
            <div className="min-w-0">
              <h3>{i18n.t("workbench.review.title")}</h3>
              <p className="mt-2 text-xs leading-5 text-[color:var(--ink-soft)]">
                {i18n.t("workbench.review.detail")}
              </p>
            </div>
            <Button
              variant="outline"
              className="shrink-0 gap-2"
              onClick={() =>
                enqueueSideChatDraft(
                  createSessionReviewFollowUpDraft({ activeSession, inspectorData }),
                  activeSession.title
                )
              }
            >
              <MessageSquarePlus size={14} />
              {i18n.t("workbench.followUp.queueSessionReview")}
            </Button>
          </div>
        </section>

        {runnerIssues.length ? (
          <section className="review-section">
            <div className="review-section-heading">
              <h3>{i18n.t("workbench.issue.title")}</h3>
              <span className="metric-pill">{runnerIssues.length}</span>
            </div>
            <div className="space-y-2">
              {runnerIssues.map((issue) => (
                <div key={issue.id} className="inspector-card">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">{issue.title}</p>
                      <p className="mt-1 text-xs leading-5 text-[color:var(--ink-soft)]">
                        {issue.providerRouteId ?? issue.backendAdapterId ?? issue.kind}
                        {issue.modelProfileId ? ` / ${issue.modelProfileId}` : ""}
                      </p>
                    </div>
                    <span className="status-pill status-danger">
                      {formatStatusLabel(i18n, issue.kind)}
                    </span>
                  </div>
                  <p className="mt-3 text-xs leading-5 text-[color:var(--ink-soft)]">
                    {issue.message}
                  </p>
                  <div className="usage-grid mt-3">
                    <UsageMetric
                      label={i18n.t("workbench.issue.routeHealth")}
                      value={formatRouteHealthLabel(i18n, issue.routeHealth)}
                    />
                    <UsageMetric
                      label={i18n.t("workbench.issue.retryable")}
                      value={formatRetryableLabel(i18n, issue.retryable)}
                    />
                    <UsageMetric
                      label={i18n.t("workbench.issue.suggestedAction")}
                      value={formatIssueSuggestedActionLabel(i18n, issue.suggestedAction)}
                    />
                  </div>
                  {shouldOfferProviderRouteFallback(issue) ? (
                    <div className="mt-3 border-t border-white/[0.055] px-1 pt-3">
                      <p className="text-xs font-semibold uppercase text-[color:var(--ink-soft)]">
                        {i18n.t("workbench.routeHealth.advisoryFallback")}
                      </p>
                      <p className="mt-2 text-xs leading-5 text-[color:var(--ink-soft)]">
                        {i18n.t("workbench.routeHealth.advisoryFallbackDetail")}
                      </p>
                      <p className="mt-2 truncate font-mono text-[11px] text-[color:var(--inverse-soft)]">
                        {formatMessage(i18n.t("workbench.routeHealth.currentDefault"), {
                          route:
                            currentProviderRoute?.label ??
                            sessionDefaults.defaultProviderRouteId
                        })}
                      </p>
                      <FallbackRouteButton
                        i18n={i18n}
                        issue={issue}
                        providerRouteOptions={providerRouteOptions}
                        selectedProviderRouteId={sessionDefaults.defaultProviderRouteId}
                        setInspectorTab={setInspectorTab}
                        updateSessionDefaults={updateSessionDefaults}
                      />
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </section>
        ) : null}

        <section className="review-section">
          <div className="review-section-heading">
            <h3>{i18n.t("workbench.continuity.title")}</h3>
            <span
              className={cn(
                "status-pill",
                streamQualityTone(liveRunContinuity.latestStreamQuality)
              )}
            >
              {formatStreamQualityLabel(i18n, liveRunContinuity.latestStreamQuality)}
            </span>
          </div>
          <div className="inspector-card">
            <div className="mb-3 border-b border-white/[0.055] px-1 pb-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold">
                    {formatLiveRunGuidanceLabel(i18n, activeSession.liveRunGuidance.kind)}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-[color:var(--ink-soft)]">
                    {formatLiveRunGuidanceDetail(i18n, activeSession.liveRunGuidance.kind)}
                  </p>
                </div>
                <span
                  className={cn(
                    "status-pill",
                    liveRunGuidanceTone(activeSession.liveRunGuidance.severity)
                  )}
                >
                  {formatLiveRunGuidanceLabel(i18n, activeSession.liveRunGuidance.kind)}
                </span>
              </div>
              {activeSession.liveRunGuidance.latestIssueKind ||
              activeSession.liveRunGuidance.suggestedAction ? (
                <p className="mt-2 text-xs leading-5 text-[color:var(--ink-muted)]">
                  {activeSession.liveRunGuidance.latestIssueKind
                    ? formatStatusLabel(i18n, activeSession.liveRunGuidance.latestIssueKind)
                    : i18n.t("workbench.status.unknown")}
                  {activeSession.liveRunGuidance.suggestedAction
                    ? ` / ${formatIssueSuggestedActionLabel(
                        i18n,
                        activeSession.liveRunGuidance.suggestedAction
                      )}`
                    : ""}
                </p>
              ) : null}
            </div>
            <div className="usage-grid">
              <UsageMetric
                label={i18n.t("workbench.continuity.externalSession")}
                value={
                  liveRunContinuity.latestExternalSessionId
                    ? formatExternalSessionId(liveRunContinuity.latestExternalSessionId)
                    : i18n.t("workbench.continuity.noExternalSession")
                }
              />
              <UsageMetric
                label={i18n.t("workbench.continuity.latestAttempt")}
                value={
                  liveRunContinuity.latestAttemptId
                    ? `${formatShortId(liveRunContinuity.latestAttemptId)} / ${
                        liveRunContinuity.latestAttemptStatus
                          ? formatStatusLabel(i18n, liveRunContinuity.latestAttemptStatus)
                          : i18n.t("workbench.status.unknown")
                      }`
                    : i18n.t("workbench.status.notAvailable")
                }
              />
              <UsageMetric
                label={i18n.t("workbench.continuity.resumeAttempts")}
                value={formatUsageNumber(i18n, liveRunContinuity.resumeAttemptCount)}
              />
              <UsageMetric
                label={i18n.t("workbench.continuity.approvalFollowUps")}
                value={formatUsageNumber(i18n, liveRunContinuity.approvalFollowUpAttemptCount)}
              />
              <UsageMetric
                label={i18n.t("workbench.continuity.cleanStreams")}
                value={formatUsageNumber(i18n, liveRunContinuity.cleanStreamAttemptCount)}
              />
              <UsageMetric
                label={i18n.t("workbench.continuity.warningStreams")}
                value={formatUsageNumber(i18n, liveRunContinuity.warningStreamAttemptCount)}
              />
            </div>
          </div>
        </section>

        <section className="review-section">
          <div className="review-section-heading">
            <h3>{i18n.t("workbench.routeHealth.title")}</h3>
            <span className="metric-pill">{providerRouteHealth.length}</span>
          </div>
          {providerRouteHealth.length ? (
            <div className="space-y-2">
              {providerRouteHealth.map((health) => (
                <div key={health.providerRouteId} className="inspector-card">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">
                        {providerRouteOptions.find((route) => route.value === health.providerRouteId)?.label ??
                          health.providerRouteId}
                      </p>
                      <p className="mt-1 text-xs leading-5 text-[color:var(--ink-soft)]">
                        {health.latestIssueTitle ?? i18n.t("workbench.status.unknown")}
                      </p>
                    </div>
                    <span className="status-pill status-warn">
                      {formatRouteHealthLabel(i18n, health.latestHealth)}
                    </span>
                  </div>
                  <div className="usage-grid mt-3">
                    <UsageMetric
                      label={i18n.t("workbench.routeHealth.issues")}
                      value={formatUsageNumber(i18n, health.issueCount)}
                    />
                    <UsageMetric
                      label={i18n.t("workbench.issue.retryable")}
                      value={formatUsageNumber(i18n, health.retryableIssueCount)}
                    />
                    <UsageMetric
                      label={i18n.t("workbench.routeHealth.latest")}
                      value={
                        health.latestIssueKind
                          ? formatStatusLabel(i18n, health.latestIssueKind)
                          : i18n.t("workbench.status.unknown")
                      }
                    />
                    <UsageMetric
                      label={i18n.t("workbench.routeHealth.models")}
                      value={
                        health.modelProfileIds.length
                          ? health.modelProfileIds.join(", ")
                          : i18n.t("workbench.status.notAvailable")
                      }
                    />
                  </div>
                  {health.latestIssueMessage ? (
                    <p className="mt-3 text-xs leading-5 text-[color:var(--ink-soft)]">
                      {health.latestIssueMessage}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <EmptyState text={i18n.t("workbench.routeHealth.noHistory")} />
          )}
        </section>

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
                    <UsageMetric
                      label={i18n.t("workbench.runAttempts.failureKind")}
                      value={
                        attempt.failureKind
                          ? formatStatusLabel(i18n, attempt.failureKind)
                          : i18n.t("workbench.status.notAvailable")
                      }
                    />
                    <UsageMetric
                      label={i18n.t("workbench.runAttempts.streamQuality")}
                      value={formatStreamQualityLabel(
                        i18n,
                        deriveRunAttemptStreamQuality(attempt)
                      )}
                    />
                    <UsageMetric
                      label={i18n.t("workbench.runAttempts.trigger")}
                      value={formatRunAttemptTriggerLabel(i18n, attempt.trigger)}
                    />
                    <UsageMetric
                      label={i18n.t("workbench.runAttempts.sourceApproval")}
                      value={
                        attempt.sourceApprovalId
                          ? formatShortId(attempt.sourceApprovalId)
                          : i18n.t("workbench.status.notAvailable")
                      }
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
                  <div className="mt-3 flex flex-wrap justify-end gap-2">
                    <Button
                      variant="ghost"
                      className="gap-2"
                      onClick={() => setInspectorTab("terminal")}
                    >
                      <Terminal size={14} />
                      {i18n.t("workbench.recovery.openTerminal")}
                    </Button>
                    <Button
                      variant={isRecoverableAttempt(attempt.status) ? "outline" : "ghost"}
                      className="gap-2"
                      onClick={() =>
                        enqueueSideChatDraft(
                          createRunAttemptFollowUpDraft(attempt),
                          formatRunAttemptSourceLabel(attempt)
                        )
                      }
                    >
                      <MessageSquarePlus size={14} />
                      {isRecoverableAttempt(attempt.status)
                        ? i18n.t("workbench.followUp.queueRecovery")
                        : i18n.t("workbench.followUp.queueRunAttempt")}
                    </Button>
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
                  className="inspector-card focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/35"
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
                        className="border-t border-white/[0.055] px-1 py-2 text-xs"
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
                label={i18n.t("workbench.selection.readiness")}
                value={formatSelectionReadinessLevelLabel(
                  i18n,
                  activeSession.selection.readiness?.level
                )}
                detail={formatSelectionReadinessDetail(activeSession.selection.readiness)}
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

function FallbackRouteButton({
  i18n,
  issue,
  providerRouteOptions,
  selectedProviderRouteId,
  setInspectorTab,
  updateSessionDefaults
}: {
  readonly i18n: UiI18n;
  readonly issue: ProjectedActiveSession["runnerIssues"][number];
  readonly providerRouteOptions: readonly WorkbenchCatalogOption[];
  readonly selectedProviderRouteId: string;
  readonly setInspectorTab: (tab: string) => void;
  readonly updateSessionDefaults: (patch: Partial<WorkbenchSessionDefaults>) => void;
}) {
  const fallbackRoute = findAdvisoryProviderRouteFallback({
    issue,
    providerRouteOptions
  });

  if (!fallbackRoute) {
    return (
      <p className="mt-3 text-xs leading-5 text-[color:var(--ink-muted)]">
        {i18n.t("workbench.routeHealth.fallbackUnavailable")}
      </p>
    );
  }

  const fallbackAlreadySelected = fallbackRoute.value === selectedProviderRouteId;

  return (
    <div className="mt-3 flex justify-end">
      <Button
        variant={fallbackAlreadySelected ? "ghost" : "outline"}
        disabled={fallbackAlreadySelected}
        onClick={() => {
          void updateSessionDefaults({ defaultProviderRouteId: fallbackRoute.value });
          setInspectorTab("settings");
        }}
      >
        {fallbackAlreadySelected
          ? i18n.t("workbench.routeHealth.fallbackAlreadySelected")
          : formatMessage(i18n.t("workbench.routeHealth.switchToFallback"), {
              route: fallbackRoute.label
            })}
      </Button>
    </div>
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

function streamQualityTone(quality: string): string {
  switch (quality) {
    case "clean":
      return "status-ok";
    case "warning":
    case "pending":
      return "status-warn";
    case "failed":
      return "status-danger";
    case "cancelled":
      return "status-neutral";
    default:
      return "status-neutral";
  }
}

function isRecoverableAttempt(status: string): boolean {
  return status === "failed" || status === "cancelled";
}

function formatRunAttemptSourceLabel(
  attempt: ProjectedActiveSession["runAttempts"][number]
): string {
  return [attempt.modelProfileId ?? attempt.mode, attempt.status, formatShortId(attempt.id)]
    .filter((value): value is string => Boolean(value))
    .join(" / ");
}

function formatShortId(value: string): string {
  return value.length > 18 ? `${value.slice(0, 10)}...${value.slice(-4)}` : value;
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
