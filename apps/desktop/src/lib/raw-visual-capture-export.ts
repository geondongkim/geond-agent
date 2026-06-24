import { redactSensitiveTextContent } from "@geond-agent/claude-code-bridge";
import { invoke } from "@tauri-apps/api/core";
import { save } from "@tauri-apps/plugin-dialog";

import {
  createRawVisualCaptureGate,
  type RawVisualCaptureGate,
  type RawVisualCaptureGateOptions
} from "./raw-visual-capture-gate.js";
import type { VisualCaptureReviewState } from "./evidence-capture-export.js";
import type { ProjectedActiveSession } from "./workbench-types.js";

export type RawVisualCaptureExportStatus =
  | "saved"
  | "cancelled"
  | "blocked"
  | "unsupported"
  | "failed";

export type RawVisualCaptureFailureKind =
  | "missing-session"
  | "native-runtime-required"
  | "save-dialog-cancelled"
  | "save-dialog-failed"
  | "review-gate-blocked"
  | "display-capture-unavailable"
  | "os-picker-denied-or-cancelled"
  | "display-frame-timeout"
  | "canvas-unavailable"
  | "png-encoding-failed"
  | "native-capture-unavailable"
  | "native-capture-failed"
  | "native-write-failed"
  | "unknown";

export interface RawVisualCaptureArtifactReference {
  readonly id: string;
  readonly sessionId: string;
  readonly sessionTitle?: string;
  readonly path: string;
  readonly fileName: string;
  readonly capturedAt: string;
  readonly payloadPersistedInWorkbench: false;
  readonly storagePolicy: "user-selected-path-only";
  readonly review: VisualCaptureReviewState;
}

export interface RawVisualCaptureExportResult {
  readonly status: RawVisualCaptureExportStatus;
  readonly failureKind?: RawVisualCaptureFailureKind;
  readonly detail?: string;
  readonly path?: string;
  readonly artifactRef?: RawVisualCaptureArtifactReference;
}

export interface RawVisualCaptureExportOptions {
  readonly activeSession?: ProjectedActiveSession;
  readonly fileName?: string;
  readonly now?: Date;
  readonly title?: string;
  readonly visualReview: VisualCaptureReviewState;
}

export interface RawVisualCaptureReadiness {
  readonly gate: RawVisualCaptureGate;
  readonly canRequestCapture: boolean;
}

export function createRawVisualCaptureReadiness(
  options: RawVisualCaptureGateOptions
): RawVisualCaptureReadiness {
  const gate = createRawVisualCaptureGate({
    ...options,
    requireStoragePathValue: true,
    rawCaptureImplementationEnabled: true
  });

  return {
    gate,
    canRequestCapture:
      Boolean(options.activeSession) &&
      options.visualReview?.explicitConsent === true &&
      options.visualReview.redactionReview === true &&
      options.visualReview.storagePathSelected === true &&
      options.visualReview.visibleContentReviewed === true
  };
}

export async function exportRawVisualCapturePng({
  activeSession,
  fileName,
  now = new Date(),
  title,
  visualReview
}: RawVisualCaptureExportOptions): Promise<RawVisualCaptureExportResult> {
  if (!activeSession) {
    return {
      status: "blocked",
      failureKind: "missing-session",
      detail: "Raw visual capture requires an active workbench session."
    };
  }
  if (!isTauriRuntime()) {
    return {
      status: "unsupported",
      failureKind: "native-runtime-required",
      detail: "Raw visual capture can only write through the native desktop runtime."
    };
  }

  let path: string | undefined;
  try {
    path = await requestRawVisualCapturePath(fileName, title);
  } catch (error) {
    return {
      status: "failed",
      failureKind: "save-dialog-failed",
      detail: sanitizeFailureDetail(error)
    };
  }
  if (!path) {
    return {
      status: "cancelled",
      failureKind: "save-dialog-cancelled",
      detail: "No raw visual PNG path was selected."
    };
  }

  const gate = createRawVisualCaptureGate({
    activeSession,
    rawCaptureImplementationEnabled: true,
    requireStoragePathValue: true,
    storagePath: path,
    visualReview
  });
  if (!gate.allowed) {
    return {
      status: "blocked",
      failureKind: "review-gate-blocked",
      detail: gate.policySummary,
      path
    };
  }

  try {
    await invoke("capture_raw_visual_png", {
      path,
      sessionId: activeSession.id,
      explicitConsent: visualReview.explicitConsent,
      redactionReview: visualReview.redactionReview,
      visibleContentReviewed: visualReview.visibleContentReviewed
    });
  } catch (error) {
    const failureKind = classifyNativeCaptureFailure(error);
    return {
      status: classifyNativeCaptureStatus(failureKind),
      failureKind,
      detail: sanitizeFailureDetail(error, failureKind),
      path
    };
  }

  return {
    status: "saved",
    path,
    artifactRef: createRawVisualCaptureArtifactReference({
      activeSession,
      capturedAt: now.toISOString(),
      path,
      visualReview
    })
  };
}

export function createRawVisualCaptureFileName({
  activeSession,
  now = new Date()
}: {
  readonly activeSession?: ProjectedActiveSession;
  readonly now?: Date;
} = {}): string {
  const title = activeSession?.title ?? activeSession?.id ?? "workbench-session";
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "workbench-session";
  return `${now.toISOString().slice(0, 10)}-${slug}-raw-visual-capture.png`;
}

export function createRawVisualCaptureArtifactReference({
  activeSession,
  capturedAt = new Date().toISOString(),
  path,
  visualReview
}: {
  readonly activeSession: ProjectedActiveSession;
  readonly capturedAt?: string;
  readonly path: string;
  readonly visualReview: VisualCaptureReviewState;
}): RawVisualCaptureArtifactReference {
  const fileName = extractFileName(path);
  return {
    id: `${activeSession.id}:${capturedAt}:${fileName}`,
    sessionId: activeSession.id,
    sessionTitle: activeSession.title,
    path,
    fileName,
    capturedAt,
    payloadPersistedInWorkbench: false,
    storagePolicy: "user-selected-path-only",
    review: {
      explicitConsent: visualReview.explicitConsent,
      redactionReview: visualReview.redactionReview,
      storagePathSelected: visualReview.storagePathSelected,
      visibleContentReviewed: visualReview.visibleContentReviewed
    }
  };
}

async function requestRawVisualCapturePath(
  fileName = createRawVisualCaptureFileName(),
  title?: string
): Promise<string | undefined> {
  const path = await save({
    defaultPath: fileName,
    filters: [{ name: "PNG image", extensions: ["png"] }],
    title
  });

  return typeof path === "string" && path.trim().length > 0 ? path : undefined;
}

function isTauriRuntime(): boolean {
  return Boolean((globalThis as { readonly __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__);
}

function classifyNativeCaptureStatus(
  failureKind: RawVisualCaptureFailureKind
): RawVisualCaptureExportStatus {
  if (failureKind === "os-picker-denied-or-cancelled") {
    return "cancelled";
  }
  if (failureKind === "native-capture-unavailable") {
    return "unsupported";
  }
  return "failed";
}

function classifyNativeCaptureFailure(error: unknown): RawVisualCaptureFailureKind {
  if (hasFailureKind(error)) {
    if (error.failureKind === "display-capture-unavailable") {
      return "native-capture-unavailable";
    }
    return error.failureKind;
  }
  const message = getErrorText(error).toLowerCase();
  if (
    message.includes("os-picker-denied-or-cancelled") ||
    message.includes("cancelled") ||
    message.includes("denied")
  ) {
    return "os-picker-denied-or-cancelled";
  }
  if (
    message.includes("native-capture-unavailable") ||
    message.includes("screencapture") ||
    message.includes("only available on macos")
  ) {
    return "native-capture-unavailable";
  }
  if (
    message.includes("display-capture-unavailable") ||
    message.includes("display capture is not available")
  ) {
    return "native-capture-unavailable";
  }
  if (isDomExceptionName(error, "NotAllowedError") || isDomExceptionName(error, "AbortError")) {
    return "os-picker-denied-or-cancelled";
  }
  return "native-capture-failed";
}

function hasFailureKind(
  error: unknown
): error is { readonly failureKind: RawVisualCaptureFailureKind } {
  return (
    typeof error === "object" &&
    error !== null &&
    "failureKind" in error &&
    typeof (error as { readonly failureKind?: unknown }).failureKind === "string"
  );
}

function isDomExceptionName(error: unknown, name: string): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    (error as { readonly name?: unknown }).name === name
  );
}

function sanitizeFailureDetail(
  error: unknown,
  failureKind?: RawVisualCaptureFailureKind
): string {
  const raw = getErrorText(error);
  if (
    failureKind === "native-capture-unavailable" &&
    /display[- ]capture|webview runtime/iu.test(raw)
  ) {
    return "Native raw visual capture is unavailable in this desktop runtime.";
  }
  return redactSensitiveTextContent(raw).trim().slice(0, 240) || "Raw visual capture failed.";
}

function getErrorText(error: unknown): string {
  return error instanceof Error
    ? error.message
    : typeof error === "string"
      ? error
      : "Raw visual capture failed.";
}

function extractFileName(path: string): string {
  return path.split(/[\\/]/u).filter(Boolean).pop() ?? "raw-visual-capture.png";
}
