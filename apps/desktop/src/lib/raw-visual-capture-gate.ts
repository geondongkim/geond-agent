import type { VisualCaptureReviewState } from "./evidence-capture-export.js";
import type { ProjectedActiveSession } from "./workbench-types.js";

export type RawVisualCaptureGateStatus =
  | "blocked-missing-review"
  | "blocked-missing-session"
  | "blocked-missing-storage-path"
  | "blocked-implementation-disabled"
  | "allowed";

export type RawVisualCaptureGateMissingStep =
  | keyof VisualCaptureReviewState
  | "activeSession"
  | "storagePath"
  | "rawCaptureImplementation";

export interface RawVisualCaptureGateOptions {
  readonly activeSession?: ProjectedActiveSession;
  readonly rawCaptureImplementationEnabled?: boolean;
  readonly requireStoragePathValue?: boolean;
  readonly storagePath?: string;
  readonly visualReview?: VisualCaptureReviewState;
}

export interface RawVisualCaptureGate {
  readonly allowed: boolean;
  readonly status: RawVisualCaptureGateStatus;
  readonly metadataOnly: true;
  readonly rawImageStorageDefault: "disabled";
  readonly missingSteps: readonly RawVisualCaptureGateMissingStep[];
  readonly review: VisualCaptureReviewState;
  readonly storagePathState: "missing" | "user-selected";
  readonly policySummary: string;
}

export function createRawVisualCaptureGate({
  activeSession,
  rawCaptureImplementationEnabled = false,
  requireStoragePathValue = false,
  storagePath,
  visualReview
}: RawVisualCaptureGateOptions): RawVisualCaptureGate {
  const review = normalizeVisualReview(visualReview);
  const missingReviewSteps = getMissingVisualReviewSteps(review);
  const storagePathSelected = storagePath?.trim()
    ? true
    : requireStoragePathValue
      ? false
      : review.storagePathSelected;
  const missingSteps: RawVisualCaptureGateMissingStep[] = [
    ...missingReviewSteps.filter((step) => step !== "storagePathSelected"),
    ...(storagePathSelected ? [] : (["storagePathSelected", "storagePath"] as const)),
    ...(activeSession ? [] : (["activeSession"] as const)),
    ...(rawCaptureImplementationEnabled ? [] : (["rawCaptureImplementation"] as const))
  ];
  const allowed = missingSteps.length === 0;
  const status = resolveGateStatus(missingSteps, allowed);

  return {
    allowed,
    status,
    metadataOnly: true,
    rawImageStorageDefault: "disabled",
    missingSteps,
    review: {
      ...review,
      storagePathSelected
    },
    storagePathState: storagePathSelected ? "user-selected" : "missing",
    policySummary: formatPolicySummary(status, missingSteps)
  };
}

export function formatRawVisualCaptureGateForReport(
  gate: RawVisualCaptureGate
): readonly string[] {
  return [
    `- raw capture allowed: ${gate.allowed ? "yes" : "no"}`,
    `- gate status: ${gate.status}`,
    `- metadata only: ${gate.metadataOnly ? "yes" : "no"}`,
    `- raw image storage default: ${gate.rawImageStorageDefault}`,
    `- storage path: ${gate.storagePathState}`,
    `- missing steps: ${gate.missingSteps.length ? gate.missingSteps.join(", ") : "none"}`,
    `- policy summary: ${gate.policySummary}`
  ];
}

function normalizeVisualReview(
  value: VisualCaptureReviewState | undefined
): VisualCaptureReviewState {
  return {
    explicitConsent: value?.explicitConsent === true,
    redactionReview: value?.redactionReview === true,
    storagePathSelected: value?.storagePathSelected === true,
    visibleContentReviewed: value?.visibleContentReviewed === true
  };
}

function getMissingVisualReviewSteps(
  review: VisualCaptureReviewState
): readonly (keyof VisualCaptureReviewState)[] {
  return VISUAL_REVIEW_STEPS.filter((step) => review[step] !== true);
}

function resolveGateStatus(
  missingSteps: readonly RawVisualCaptureGateMissingStep[],
  allowed: boolean
): RawVisualCaptureGateStatus {
  if (allowed) {
    return "allowed";
  }
  if (missingSteps.includes("activeSession")) {
    return "blocked-missing-session";
  }
  if (
    missingSteps.includes("storagePath") ||
    missingSteps.includes("storagePathSelected")
  ) {
    return "blocked-missing-storage-path";
  }
  if (missingSteps.includes("rawCaptureImplementation")) {
    return "blocked-implementation-disabled";
  }
  return "blocked-missing-review";
}

function formatPolicySummary(
  status: RawVisualCaptureGateStatus,
  missingSteps: readonly RawVisualCaptureGateMissingStep[]
): string {
  if (status === "allowed") {
    return "Raw visual capture may proceed only for this explicit export action.";
  }
  if (status === "blocked-implementation-disabled") {
    return "Consent, redaction, session, and storage are ready, but raw visual payload capture is not enabled in this build.";
  }
  return `Raw visual capture is blocked until ${missingSteps.join(", ")} is resolved.`;
}

const VISUAL_REVIEW_STEPS: readonly (keyof VisualCaptureReviewState)[] = [
  "explicitConsent",
  "redactionReview",
  "storagePathSelected",
  "visibleContentReviewed"
];
