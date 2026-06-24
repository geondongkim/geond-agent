import {
  createEvidenceCaptureReadiness,
  type EvidenceCaptureKind,
  type EvidenceCaptureReadiness
} from "./evidence-capture.js";
import { createDogfoodWorkflowSummary } from "./dogfood-workflow-summary.js";
import type { InspectorSessionReadModel } from "./inspector-read-model.js";
import { createLiveDogfoodRunbook } from "./live-dogfood-runbook.js";
import { createRawVisualCaptureGate } from "./raw-visual-capture-gate.js";
import type {
  ProjectedActiveSession,
  ProjectedSessionListItem
} from "./workbench-types.js";

export type EvidenceCaptureArtifactKind =
  | "screenshot-manifest"
  | "structured-trace"
  | "multi-session-trace-bundle"
  | "visual-capture-policy";

export interface EvidenceCaptureArtifactOptions {
  readonly activeSession?: ProjectedActiveSession;
  readonly generatedAt?: string;
  readonly inspectorData?: InspectorSessionReadModel;
  readonly projectedSessions?: readonly ProjectedSessionListItem[];
  readonly visualReview?: VisualCaptureReviewState;
}

export interface EvidenceCaptureArtifact {
  readonly fileName: string;
  readonly kind: EvidenceCaptureArtifactKind;
  readonly text: string;
}

export interface VisualCaptureReviewState {
  readonly explicitConsent: boolean;
  readonly redactionReview: boolean;
  readonly storagePathSelected: boolean;
  readonly visibleContentReviewed: boolean;
}

interface CapturePolicy {
  readonly consent: "explicit-export-action";
  readonly metadataOnly: true;
  readonly rawStoragePolicy: "never-store-raw-by-default";
  readonly redaction: "configured-for-metadata-export";
}

export function createStructuredTraceArtifact(
  options: EvidenceCaptureArtifactOptions
): EvidenceCaptureArtifact {
  return createCaptureArtifact({
    ...options,
    captureKind: "structured-trace",
    kind: "structured-trace"
  });
}

export function createScreenshotManifestArtifact(
  options: EvidenceCaptureArtifactOptions
): EvidenceCaptureArtifact {
  return createCaptureArtifact({
    ...options,
    captureKind: "screenshot",
    kind: "screenshot-manifest"
  });
}

export function createMultiSessionTraceBundleArtifact(
  options: EvidenceCaptureArtifactOptions
): EvidenceCaptureArtifact {
  const generatedAt = options.generatedAt ?? new Date().toISOString();
  const sessions = options.projectedSessions ?? [];
  const dogfoodWorkflow = createDogfoodWorkflowSummary({
    activeSession: options.activeSession,
    inspectorData: options.inspectorData,
    selectedSessions: sessions,
    sessions
  });
  const liveDogfoodRunbook = createLiveDogfoodRunbook({
    activeSession: options.activeSession,
    generatedAt,
    inspectorData: options.inspectorData,
    projectedSessions: sessions,
    selectedSessions: sessions
  });
  const readiness = createEvidenceCaptureReadiness({
    consentGranted: true,
    redactionConfigured: true,
    structuredTraceCount: Math.max(1, sessions.length)
  });
  const payload = {
    schemaVersion: 1,
    kind: "multi-session-trace-bundle",
    generatedAt,
    capturePolicy: createCapturePolicy(),
    readiness: readiness.map(serializeReadiness),
    activeSession: serializeSession(options.activeSession, options.inspectorData),
    sessions: sessions.map(serializeSessionIndexItem),
    traceBundle: {
      metadataOnly: true,
      sessionCount: sessions.length,
      selectedSessionIds: sessions.map((session) => session.id),
      warningSessionCount: sessions.filter((session) => session.warningCount > 0).length,
      errorSessionCount: sessions.filter((session) => session.errorCount > 0).length,
      resumableSessionCount: sessions.filter((session) => session.resumable).length,
      pendingApprovalCount: sessions.reduce(
        (count, session) => count + session.pendingApprovalCount,
        0
      )
    },
    dogfoodWorkflow,
    liveDogfoodRunbook: serializeLiveDogfoodRunbook(liveDogfoodRunbook),
    reviewPrompts: [
      "Which sessions need retry, resume, approval follow-up, or route health review?",
      "Which sessions have enough metadata-only evidence for a local issue report?",
      "Which session ids should be exported as separate structured trace artifacts?"
    ],
    note:
      "This bundle groups session/trace metadata for local issue review. It excludes raw logs, prompt bodies, conversation bodies, image payloads, and provider secrets."
  };

  return {
    fileName: createEvidenceCaptureArtifactFileName("multi-session-trace-bundle"),
    kind: "multi-session-trace-bundle",
    text: `${JSON.stringify(payload, null, 2)}\n`
  };
}

export function createVisualCapturePolicyArtifact(
  options: EvidenceCaptureArtifactOptions
): EvidenceCaptureArtifact {
  const generatedAt = options.generatedAt ?? new Date().toISOString();
  const visualReview = normalizeVisualReview(options.visualReview);
  const sessions = options.projectedSessions ?? [];
  const dogfoodWorkflow = createDogfoodWorkflowSummary({
    activeSession: options.activeSession,
    inspectorData: options.inspectorData,
    sessions,
    visualReview
  });
  const rawVisualCaptureGate = createRawVisualCaptureGate({
    activeSession: options.activeSession,
    visualReview
  });
  const liveDogfoodRunbook = createLiveDogfoodRunbook({
    activeSession: options.activeSession,
    generatedAt,
    inspectorData: options.inspectorData,
    projectedSessions: sessions,
    visualReview
  });
  const reviewReady =
    visualReview.explicitConsent &&
    visualReview.redactionReview &&
    visualReview.storagePathSelected &&
    visualReview.visibleContentReviewed;
  const payload = {
    schemaVersion: 1,
    kind: "visual-capture-policy",
    generatedAt,
    capturePolicy: createCapturePolicy(),
    activeSession: serializeSession(options.activeSession, options.inspectorData),
    visualCapture: {
      status: reviewReady
        ? "policy-reviewed-raw-capture-still-disabled"
        : "deferred-until-explicit-consent-and-redaction",
      rawImageStorageDefault: "disabled",
      requiredUserAction: "per-export visual capture consent",
      reviewReady,
      review: visualReview,
      gate: rawVisualCaptureGate,
      missingReviewSteps: dogfoodWorkflow.missingVisualReviewSteps,
      redactionRequirements: [
        "review visible workspace paths before capture",
        "hide provider keys, tokens, account state, and local private files",
        "prefer manifest-only export when the visual surface is not required",
        "store visual artifacts only in a user-selected path"
      ],
      blockedDataClasses: [
        "provider secrets",
        "raw Claude stream logs",
        "private file contents",
        "local session files",
        "unreviewed browser or terminal output"
      ]
    },
    dogfoodWorkflow,
    liveDogfoodRunbook: serializeLiveDogfoodRunbook(liveDogfoodRunbook),
    note:
      "This policy artifact documents the consent/redaction boundary for future visual capture. It does not include image payload data."
  };

  return {
    fileName: createEvidenceCaptureArtifactFileName("visual-capture-policy"),
    kind: "visual-capture-policy",
    text: `${JSON.stringify(payload, null, 2)}\n`
  };
}

function normalizeVisualReview(
  value: VisualCaptureReviewState | undefined
): VisualCaptureReviewState {
  return {
    explicitConsent: value?.explicitConsent ?? false,
    redactionReview: value?.redactionReview ?? false,
    storagePathSelected: value?.storagePathSelected ?? false,
    visibleContentReviewed: value?.visibleContentReviewed ?? false
  };
}

function createCaptureArtifact(
  options: EvidenceCaptureArtifactOptions & {
    readonly captureKind: EvidenceCaptureKind;
    readonly kind: EvidenceCaptureArtifactKind;
  }
): EvidenceCaptureArtifact {
  const generatedAt = options.generatedAt ?? new Date().toISOString();
  const readiness = createEvidenceCaptureReadiness({
    consentGranted: true,
    redactionConfigured: true,
    screenshotCount: options.captureKind === "screenshot" ? 1 : 0,
    structuredTraceCount: options.captureKind === "structured-trace" ? 1 : 0
  });
  const sessions = options.projectedSessions ?? [];
  const dogfoodWorkflow = createDogfoodWorkflowSummary({
    activeSession: options.activeSession,
    inspectorData: options.inspectorData,
    sessions,
    visualReview: options.visualReview
  });
  const liveDogfoodRunbook = createLiveDogfoodRunbook({
    activeSession: options.activeSession,
    generatedAt,
    inspectorData: options.inspectorData,
    projectedSessions: sessions,
    visualReview: options.visualReview
  });
  const payload = {
    schemaVersion: 1,
    kind: options.kind,
    generatedAt,
    capturePolicy: createCapturePolicy(),
    readiness: readiness.map(serializeReadiness),
    activeSession: serializeSession(options.activeSession, options.inspectorData),
    workspace: {
      activeWorkspacePath: options.activeSession?.workspacePath,
      indexedSessionCount: sessions.length
    },
    dogfoodWorkflow,
    liveDogfoodRunbook: serializeLiveDogfoodRunbook(liveDogfoodRunbook),
    note:
      options.kind === "screenshot-manifest"
        ? "This manifest records a user-approved screenshot capture boundary. It does not include image payload data."
        : "This structured trace records metadata-only workbench evidence. It excludes raw logs, prompt bodies, conversation bodies, and provider secrets."
  };

  return {
    fileName: createEvidenceCaptureArtifactFileName(options.kind, options.activeSession),
    kind: options.kind,
    text: `${JSON.stringify(payload, null, 2)}\n`
  };
}

export function createEvidenceCaptureArtifactFileName(
  kind: EvidenceCaptureArtifactKind,
  activeSession?: ProjectedActiveSession
): string {
  if (kind === "multi-session-trace-bundle") {
    return "workbench-multi-session-trace-bundle.json";
  }
  if (kind === "visual-capture-policy") {
    return "workbench-visual-capture-policy.json";
  }

  const sessionPart = sanitizeFileName(activeSession?.id ?? "workbench");
  return `${sessionPart}-${kind}.json`;
}

function createCapturePolicy(): CapturePolicy {
  return {
    consent: "explicit-export-action",
    metadataOnly: true,
    rawStoragePolicy: "never-store-raw-by-default",
    redaction: "configured-for-metadata-export"
  };
}

function serializeReadiness(item: EvidenceCaptureReadiness) {
  return {
    kind: item.kind,
    status: item.status,
    capturedItemCount: item.capturedItemCount,
    consentGranted: item.consentGranted,
    redactionConfigured: item.redactionConfigured,
    rawStoragePolicy: item.rawStoragePolicy
  };
}

function serializeSession(
  activeSession: ProjectedActiveSession | undefined,
  inspectorData: InspectorSessionReadModel | undefined
) {
  if (!activeSession) {
    return undefined;
  }

  const contextAttachments = inspectorData?.contextAttachments ?? activeSession.contextAttachments;
  const toolCalls = inspectorData?.toolCalls ?? activeSession.toolCalls;
  const commandOutputs = inspectorData?.commandOutputs ?? activeSession.commandOutputs;
  const diffs = inspectorData?.diffs ?? activeSession.diffs;
  const usageReports = inspectorData?.usageReports ?? activeSession.usageReports;
  const runAttempts = inspectorData?.runAttempts ?? activeSession.runAttempts;
  const latestRunAttempt = runAttempts[0];

  return {
    id: activeSession.id,
    title: activeSession.title,
    lifecycle: activeSession.lifecycle,
    workspacePath: activeSession.workspacePath,
    selection: activeSession.selection
      ? {
          backendAdapterId: activeSession.selection.backendAdapterId,
          providerRouteId: activeSession.selection.providerRouteId,
          modelProfileId: activeSession.selection.modelProfileId,
          routingMode: activeSession.selection.routingMode,
          uiLanguage: activeSession.selection.uiLanguage,
          agentResponseLanguage: activeSession.selection.agentResponseLanguage,
          capabilityWarningCount: activeSession.selection.capabilityWarnings?.length ?? 0
        }
      : undefined,
    counts: {
      contextAttachments: contextAttachments.length,
      toolCalls: toolCalls.length,
      commandOutputs: commandOutputs.length,
      diffSummaries: diffs.length,
      usageReports: usageReports.length,
      runAttempts: runAttempts.length,
      approvals: activeSession.approvals.length,
      runnerIssues: activeSession.runnerIssues.length
    },
    routeHealth: activeSession.providerRouteHealth.map((health) => ({
      providerRouteId: health.providerRouteId,
      latestHealth: health.latestHealth,
      latestIssueKind: health.latestIssueKind,
      latestAttemptStatus: health.latestAttemptStatus,
      issueCount: health.issueCount,
      successfulAttemptCount: health.successfulAttemptCount,
      retryableIssueCount: health.retryableIssueCount,
      suggestedActions: health.suggestedActions,
      modelProfileIds: health.modelProfileIds
    })),
    contextAttachments: contextAttachments.map((attachment) => ({
      id: attachment.id,
      kind: attachment.kind,
      title: attachment.title,
      contentState: attachment.contentState,
      path: attachment.path,
      provenance: attachment.provenance
    })),
    diffs: diffs.map((diff) => ({
      id: diff.id,
      title: diff.title,
      fileCount: diff.files.length,
      files: diff.files.map((file) => ({
        path: file.path,
        changeKind: file.changeKind,
        additions: file.additions,
        deletions: file.deletions
      }))
    })),
    latestRunAttempt: latestRunAttempt
      ? {
          id: latestRunAttempt.id,
          mode: latestRunAttempt.mode,
          status: latestRunAttempt.status,
          providerRouteId: latestRunAttempt.providerRouteId,
          modelProfileId: latestRunAttempt.modelProfileId,
          exitCode: latestRunAttempt.exitCode,
          failureKind: latestRunAttempt.failureKind,
          trigger: latestRunAttempt.trigger,
          parentRunAttemptId: latestRunAttempt.parentRunAttemptId,
          followUpReason: latestRunAttempt.followUpReason,
          sourceApprovalId: latestRunAttempt.sourceApprovalId,
          eventCount: latestRunAttempt.eventCount,
          ignoredRecordCount: latestRunAttempt.ignoredRecordCount,
          parseWarningCount: latestRunAttempt.parseWarningCount
        }
      : undefined
  };
}

function serializeSessionIndexItem(session: ProjectedSessionListItem) {
  return {
    id: session.id,
    title: session.title,
    lifecycle: session.lifecycle,
    workspacePath: session.workspacePath,
    backendAdapterId: session.backendAdapterId,
    backendLabel: session.backendLabel,
    pendingApprovalCount: session.pendingApprovalCount,
    warningCount: session.warningCount,
    errorCount: session.errorCount,
    resumable: session.resumable,
    updatedAt: session.updatedAt
  };
}

function serializeLiveDogfoodRunbook(runbook: ReturnType<typeof createLiveDogfoodRunbook>) {
  return {
    generatedAt: runbook.generatedAt,
    sessionId: runbook.sessionId,
    workspacePath: runbook.workspacePath,
    steps: runbook.steps.map((step) => ({
      id: step.id,
      status: step.status,
      title: step.title,
      detail: step.detail,
      evidenceHint: step.evidenceHint
    })),
    rawVisualCaptureGate: runbook.rawVisualCaptureGate
  };
}

function sanitizeFileName(value: string): string {
  return value
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "workbench";
}
