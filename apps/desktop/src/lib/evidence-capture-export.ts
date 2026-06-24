import {
  createEvidenceCaptureReadiness,
  type EvidenceCaptureKind,
  type EvidenceCaptureReadiness
} from "./evidence-capture.js";
import type { InspectorSessionReadModel } from "./inspector-read-model.js";
import type {
  ProjectedActiveSession,
  ProjectedSessionListItem
} from "./workbench-types.js";

export type EvidenceCaptureArtifactKind = "screenshot-manifest" | "structured-trace";

export interface EvidenceCaptureArtifactOptions {
  readonly activeSession?: ProjectedActiveSession;
  readonly generatedAt?: string;
  readonly inspectorData?: InspectorSessionReadModel;
  readonly projectedSessions?: readonly ProjectedSessionListItem[];
}

export interface EvidenceCaptureArtifact {
  readonly fileName: string;
  readonly kind: EvidenceCaptureArtifactKind;
  readonly text: string;
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
  const payload = {
    schemaVersion: 1,
    kind: options.kind,
    generatedAt,
    capturePolicy: createCapturePolicy(),
    readiness: readiness.map(serializeReadiness),
    activeSession: serializeSession(options.activeSession, options.inspectorData),
    workspace: {
      activeWorkspacePath: options.activeSession?.workspacePath,
      indexedSessionCount: options.projectedSessions?.length ?? 0
    },
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
    latestRunAttempt: runAttempts.at(-1)
      ? {
          id: runAttempts.at(-1)?.id,
          mode: runAttempts.at(-1)?.mode,
          status: runAttempts.at(-1)?.status,
          exitCode: runAttempts.at(-1)?.exitCode,
          failureKind: runAttempts.at(-1)?.failureKind,
          trigger: runAttempts.at(-1)?.trigger,
          eventCount: runAttempts.at(-1)?.eventCount,
          ignoredRecordCount: runAttempts.at(-1)?.ignoredRecordCount,
          parseWarningCount: runAttempts.at(-1)?.parseWarningCount
        }
      : undefined
  };
}

function sanitizeFileName(value: string): string {
  return value
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "workbench";
}
