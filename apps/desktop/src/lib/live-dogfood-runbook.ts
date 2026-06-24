import {
  createDogfoodWorkflowSummary,
  formatDogfoodWorkflowSummaryForReport,
  type DogfoodWorkflowSummary
} from "./dogfood-workflow-summary.js";
import type { InspectorSessionReadModel } from "./inspector-read-model.js";
import {
  createRawVisualCaptureGate,
  formatRawVisualCaptureGateForReport,
  type RawVisualCaptureGate
} from "./raw-visual-capture-gate.js";
import type { VisualCaptureReviewState } from "./evidence-capture-export.js";
import type {
  ProjectedActiveSession,
  ProjectedSessionListItem
} from "./workbench-types.js";

export type LiveDogfoodRunbookStepId =
  | "route_switch"
  | "retry"
  | "cancel"
  | "resume"
  | "evidence_export"
  | "raw_visual_capture";

export type LiveDogfoodRunbookStepStatus =
  | "observed"
  | "ready"
  | "attention"
  | "blocked"
  | "pending";

export interface LiveDogfoodRunbookStep {
  readonly id: LiveDogfoodRunbookStepId;
  readonly status: LiveDogfoodRunbookStepStatus;
  readonly title: string;
  readonly detail: string;
  readonly evidenceHint: string;
}

export interface LiveDogfoodRunbook {
  readonly generatedAt: string;
  readonly sessionId?: string;
  readonly workspacePath?: string;
  readonly summary: DogfoodWorkflowSummary;
  readonly rawVisualCaptureGate: RawVisualCaptureGate;
  readonly steps: readonly LiveDogfoodRunbookStep[];
}

export interface LiveDogfoodRunbookOptions {
  readonly activeSession?: ProjectedActiveSession;
  readonly generatedAt?: string;
  readonly inspectorData?: InspectorSessionReadModel;
  readonly projectedSessions: readonly ProjectedSessionListItem[];
  readonly selectedSessions?: readonly ProjectedSessionListItem[];
  readonly visualReview?: VisualCaptureReviewState;
}

export function createLiveDogfoodRunbook({
  activeSession,
  generatedAt = new Date().toISOString(),
  inspectorData,
  projectedSessions,
  selectedSessions,
  visualReview
}: LiveDogfoodRunbookOptions): LiveDogfoodRunbook {
  const summary = createDogfoodWorkflowSummary({
    activeSession,
    inspectorData,
    selectedSessions,
    sessions: projectedSessions,
    visualReview
  });
  const rawVisualCaptureGate = createRawVisualCaptureGate({
    activeSession,
    visualReview
  });
  const runAttempts = inspectorData?.runAttempts ?? activeSession?.runAttempts ?? [];
  const guidance = activeSession?.liveRunGuidance;
  const continuity = activeSession?.liveRunContinuity;

  return {
    generatedAt,
    sessionId: activeSession?.id ?? inspectorData?.sessionId,
    workspacePath: activeSession?.workspacePath,
    summary,
    rawVisualCaptureGate,
    steps: [
      createRouteSwitchStep(summary, guidance),
      createRetryStep(summary, runAttempts),
      createCancelStep(summary),
      createResumeStep(continuity, guidance),
      createEvidenceExportStep(summary),
      createRawVisualCaptureStep(rawVisualCaptureGate)
    ]
  };
}

export function formatLiveDogfoodRunbookForReport(
  runbook: LiveDogfoodRunbook
): readonly string[] {
  return [
    `- generated at: ${runbook.generatedAt}`,
    `- session: ${runbook.sessionId ?? "none"}`,
    `- workspace: ${runbook.workspacePath ?? "unknown"}`,
    "",
    "Dogfood workflow summary",
    ...formatDogfoodWorkflowSummaryForReport(runbook.summary),
    "",
    "Live dogfood steps",
    ...runbook.steps.flatMap((step) => [
      `- ${step.title}: ${step.status}`,
      `  - detail: ${step.detail}`,
      `  - evidence: ${step.evidenceHint}`
    ]),
    "",
    "Raw visual capture gate",
    ...formatRawVisualCaptureGateForReport(runbook.rawVisualCaptureGate)
  ];
}

function createRouteSwitchStep(
  summary: DogfoodWorkflowSummary,
  guidance: ProjectedActiveSession["liveRunGuidance"] | undefined
): LiveDogfoodRunbookStep {
  if (
    summary.routeSwitchCandidateCount > 0 ||
    (guidance?.nextActions ?? []).includes("switch_route")
  ) {
    return {
      id: "route_switch",
      status: "attention",
      title: "Manual route switch",
      detail:
        "A provider route is degraded or has a retryable issue. Review route metadata before the next live run.",
      evidenceHint:
        "Check provider route health, runner issue kind, next-run provider route, and model alias."
    };
  }
  if (summary.healthyRouteCount > 0) {
    return {
      id: "route_switch",
      status: "observed",
      title: "Manual route switch",
      detail:
        "At least one provider route has a healthy attempt. Keep manual routing unless a future issue suggests switching.",
      evidenceHint: "Healthy route count and successful run attempts are projected."
    };
  }
  return {
    id: "route_switch",
    status: "pending",
    title: "Manual route switch",
    detail: "No route health evidence has been projected yet.",
    evidenceHint: "Run a live Claude attempt before deciding whether route switching needs attention."
  };
}

function createRetryStep(
  summary: DogfoodWorkflowSummary,
  runAttempts: ProjectedActiveSession["runAttempts"]
): LiveDogfoodRunbookStep {
  const hasFollowUpAttempt = runAttempts.some(
    (attempt) => Boolean(attempt.parentRunAttemptId) || attempt.trigger === "manual_resume"
  );
  if (summary.retryableIssueCount > 0 || summary.liveFailedCount > 0) {
    return {
      id: "retry",
      status: hasFollowUpAttempt ? "observed" : "attention",
      title: "Retry after failure",
      detail: hasFollowUpAttempt
        ? "A follow-up attempt exists after a failed or retryable run."
        : "Retryable failure metadata exists but no follow-up attempt is projected yet.",
      evidenceHint:
        "Compare failed run attempt id, parent attempt id, trigger, provider route, and model profile."
    };
  }
  if (summary.liveSucceededCount > 0) {
    return {
      id: "retry",
      status: "ready",
      title: "Retry after failure",
      detail: "Successful live run metadata exists. Retry dogfood can wait for the next real failure.",
      evidenceHint: "Successful attempt count is available for baseline comparison."
    };
  }
  return {
    id: "retry",
    status: "pending",
    title: "Retry after failure",
    detail: "No live run attempts are projected yet.",
    evidenceHint: "Start a live run before testing retry behavior."
  };
}

function createCancelStep(summary: DogfoodWorkflowSummary): LiveDogfoodRunbookStep {
  if (summary.liveCancelledCount > 0) {
    return {
      id: "cancel",
      status: "observed",
      title: "Cancel during live run",
      detail: "A cancelled live attempt is projected and should be preserved as local evidence.",
      evidenceHint: "Check cancelled attempt status, exit code, stream quality, and timeline issue label."
    };
  }
  if (summary.runAttemptCount > 0) {
    return {
      id: "cancel",
      status: "ready",
      title: "Cancel during live run",
      detail: "Live attempts exist. Run one deliberate cancellation to confirm UI state and report wording.",
      evidenceHint: "Use a local-only dogfood run; do not export raw stream logs."
    };
  }
  return {
    id: "cancel",
    status: "pending",
    title: "Cancel during live run",
    detail: "No live attempt exists yet.",
    evidenceHint: "Start a long enough live run before cancel dogfood."
  };
}

function createResumeStep(
  continuity: ProjectedActiveSession["liveRunContinuity"] | undefined,
  guidance: ProjectedActiveSession["liveRunGuidance"] | undefined
): LiveDogfoodRunbookStep {
  if ((continuity?.resumeAttemptCount ?? 0) > 0) {
    return {
      id: "resume",
      status: "observed",
      title: "Resume external session",
      detail: "Resume attempt metadata is projected for the active session.",
      evidenceHint:
        "Check latest external session id, resumed-from id, resume count, and stream quality."
    };
  }
  if (guidance?.canResume || continuity?.latestExternalSessionId) {
    return {
      id: "resume",
      status: "ready",
      title: "Resume external session",
      detail: "External session continuity exists. A manual resume dogfood run is ready.",
      evidenceHint: "Use the projected external session id without exposing raw Claude session files."
    };
  }
  return {
    id: "resume",
    status: "pending",
    title: "Resume external session",
    detail: "No external Claude session id is projected yet.",
    evidenceHint: "A successful live run should create the continuity evidence first."
  };
}

function createEvidenceExportStep(summary: DogfoodWorkflowSummary): LiveDogfoodRunbookStep {
  if (summary.attentionSessionCount > 0) {
    return {
      id: "evidence_export",
      status: "attention",
      title: "Evidence/report export",
      detail: "One or more selected sessions need an issue report, trace bundle, or recovery brief.",
      evidenceHint:
        "Export metadata-only workspace or multi-session reports before sharing a dogfood issue."
    };
  }
  return {
    id: "evidence_export",
    status: "ready",
    title: "Evidence/report export",
    detail: "Metadata-only export surfaces are ready for the current projected sessions.",
    evidenceHint: "Use export manifest or workspace report if a future run needs review."
  };
}

function createRawVisualCaptureStep(
  gate: RawVisualCaptureGate
): LiveDogfoodRunbookStep {
  return {
    id: "raw_visual_capture",
    status: gate.allowed ? "ready" : "blocked",
    title: "Raw visual capture",
    detail: gate.policySummary,
    evidenceHint:
      "Raw visual payload capture stays disabled until explicit consent, redaction review, active session, storage path, and implementation gates all pass."
  };
}
