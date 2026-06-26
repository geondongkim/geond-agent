import type { VisualCaptureReviewState } from "./evidence-capture-export.js";
import type { InspectorSessionReadModel } from "./inspector-read-model.js";
import type {
  ProjectedActiveSession,
  ProjectedSessionListItem
} from "./workbench-types.js";

export type DogfoodWorkflowAction =
  | "manual_route_switch_review"
  | "retry_resume_review"
  | "multi_session_issue_report"
  | "visual_capture_policy_review"
  | "continue_dogfood";

export interface DogfoodWorkflowSummary {
  readonly sessionCount: number;
  readonly selectedSessionCount: number;
  readonly attentionSessionCount: number;
  readonly runAttemptCount: number;
  readonly liveSucceededCount: number;
  readonly liveFailedCount: number;
  readonly liveCancelledCount: number;
  readonly retryableIssueCount: number;
  readonly routeSwitchCandidateCount: number;
  readonly healthyRouteCount: number;
  readonly degradedRouteCount: number;
  readonly unavailableRouteCount: number;
  readonly visualReviewReady: boolean;
  readonly missingVisualReviewSteps: readonly (keyof VisualCaptureReviewState)[];
  readonly recommendedActions: readonly DogfoodWorkflowAction[];
}

export function createDogfoodWorkflowSummary({
  activeSession,
  inspectorData,
  selectedSessions,
  sessions,
  visualReview
}: {
  readonly activeSession?: ProjectedActiveSession;
  readonly inspectorData?: InspectorSessionReadModel;
  readonly selectedSessions?: readonly ProjectedSessionListItem[];
  readonly sessions: readonly ProjectedSessionListItem[];
  readonly visualReview?: VisualCaptureReviewState;
}): DogfoodWorkflowSummary {
  const scopedSessions = selectedSessions ?? sessions;
  const runAttempts = inspectorData?.runAttempts ?? activeSession?.runAttempts ?? [];
  const runnerIssues = activeSession?.runnerIssues ?? [];
  const routeHealth = activeSession?.providerRouteHealth ?? [];
  const missingVisualReviewSteps = getMissingVisualReviewSteps(visualReview);
  const routeSwitchCandidateRouteIds = new Set<string>();

  runnerIssues
    .filter((issue) => ROUTE_SWITCH_ISSUE_KINDS.has(issue.kind))
    .forEach((issue) => routeSwitchCandidateRouteIds.add(issue.providerRouteId ?? issue.id));
  routeHealth
    .filter(
      (health) =>
        health.suggestedActions.includes("switch_route") ||
        health.latestHealth === "degraded" ||
        health.latestHealth === "unavailable"
    )
    .forEach((health) => routeSwitchCandidateRouteIds.add(health.providerRouteId));

  const summary: DogfoodWorkflowSummary = {
    sessionCount: sessions.length,
    selectedSessionCount: scopedSessions.length,
    attentionSessionCount: scopedSessions.filter(isAttentionSession).length,
    runAttemptCount: runAttempts.length,
    liveSucceededCount: runAttempts.filter((attempt) => attempt.status === "succeeded").length,
    liveFailedCount: runAttempts.filter((attempt) => attempt.status === "failed").length,
    liveCancelledCount: runAttempts.filter((attempt) => attempt.status === "cancelled").length,
    retryableIssueCount:
      runnerIssues.filter((issue) => issue.retryable).length +
      routeHealth.reduce((count, health) => count + health.retryableIssueCount, 0),
    routeSwitchCandidateCount: routeSwitchCandidateRouteIds.size,
    healthyRouteCount: routeHealth.filter((health) => health.latestHealth === "healthy").length,
    degradedRouteCount: routeHealth.filter((health) => health.latestHealth === "degraded").length,
    unavailableRouteCount: routeHealth.filter((health) => health.latestHealth === "unavailable").length,
    visualReviewReady: missingVisualReviewSteps.length === 0,
    missingVisualReviewSteps,
    recommendedActions: []
  };

  return {
    ...summary,
    recommendedActions: createRecommendedActions(summary)
  };
}

export function formatDogfoodWorkflowSummaryForReport(
  summary: DogfoodWorkflowSummary
): readonly string[] {
  return [
    `- sessions: ${summary.sessionCount}`,
    `- selected sessions: ${summary.selectedSessionCount}`,
    `- attention sessions: ${summary.attentionSessionCount}`,
    `- run attempts: ${summary.runAttemptCount}`,
    `- live succeeded: ${summary.liveSucceededCount}`,
    `- live failed: ${summary.liveFailedCount}`,
    `- live cancelled: ${summary.liveCancelledCount}`,
    `- retryable issues: ${summary.retryableIssueCount}`,
    `- route switch candidates: ${summary.routeSwitchCandidateCount}`,
    `- route health: healthy=${summary.healthyRouteCount} degraded=${summary.degradedRouteCount} unavailable=${summary.unavailableRouteCount}`,
    `- visual review ready: ${summary.visualReviewReady ? "yes" : "no"}`,
    `- missing visual review steps: ${
      summary.missingVisualReviewSteps.length
        ? summary.missingVisualReviewSteps.join(", ")
        : "none"
    }`,
    `- recommended actions: ${summary.recommendedActions.join(", ")}`
  ];
}

function createRecommendedActions(
  summary: Omit<DogfoodWorkflowSummary, "recommendedActions">
): readonly DogfoodWorkflowAction[] {
  const actions: DogfoodWorkflowAction[] = [];
  if (summary.routeSwitchCandidateCount > 0) {
    actions.push("manual_route_switch_review");
  }
  if (summary.liveFailedCount > 0 || summary.liveCancelledCount > 0) {
    actions.push("retry_resume_review");
  }
  if (summary.attentionSessionCount > 0) {
    actions.push("multi_session_issue_report");
  }
  if (!summary.visualReviewReady) {
    actions.push("visual_capture_policy_review");
  }
  return actions.length > 0 ? actions : ["continue_dogfood"];
}

function getMissingVisualReviewSteps(
  review: VisualCaptureReviewState | undefined
): readonly (keyof VisualCaptureReviewState)[] {
  return VISUAL_REVIEW_STEPS.filter((step) => review?.[step] !== true);
}

function isAttentionSession(session: ProjectedSessionListItem): boolean {
  return (
    session.errorCount > 0 ||
    session.warningCount > 0 ||
    session.pendingApprovalCount > 0 ||
    session.resumable
  );
}

const VISUAL_REVIEW_STEPS: readonly (keyof VisualCaptureReviewState)[] = [
  "explicitConsent",
  "redactionReview",
  "storagePathSelected",
  "visibleContentReviewed"
];

const ROUTE_SWITCH_ISSUE_KINDS = new Set([
  "provider_overloaded",
  "provider_quota",
  "provider_model",
  "provider_timeout",
  "retry_exhausted"
]);
