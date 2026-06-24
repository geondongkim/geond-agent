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

  let pngBase64: string;
  try {
    pngBase64 = await captureDisplayFrameAsPngBase64();
  } catch (error) {
    return {
      status: classifyDisplayCaptureStatus(error),
      failureKind: classifyDisplayCaptureFailure(error),
      detail: sanitizeFailureDetail(error),
      path
    };
  }

  try {
    await invoke("write_raw_visual_capture_png", {
      path,
      sessionId: activeSession.id,
      pngBase64,
      explicitConsent: visualReview.explicitConsent,
      redactionReview: visualReview.redactionReview,
      visibleContentReviewed: visualReview.visibleContentReviewed
    });
  } catch (error) {
    return {
      status: "failed",
      failureKind: "native-write-failed",
      detail: sanitizeFailureDetail(error),
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

export function stripPngDataUrlPrefix(value: string): string | undefined {
  const match = /^data:image\/png;base64,([A-Za-z0-9+/=]+)$/u.exec(value.trim());
  return match?.[1];
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

async function captureDisplayFrameAsPngBase64(): Promise<string> {
  const mediaDevices = globalThis.navigator?.mediaDevices;
  if (!mediaDevices?.getDisplayMedia) {
    throw createRawVisualCaptureError(
      "display-capture-unavailable",
      "Display capture is not available in this runtime."
    );
  }

  const stream = await mediaDevices.getDisplayMedia({
    audio: false,
    video: {
      displaySurface: "window"
    }
  });

  try {
    const video = globalThis.document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.srcObject = stream;
    await video.play();
    await waitForVideoFrame(video);

    const width = Math.max(1, video.videoWidth);
    const height = Math.max(1, video.videoHeight);
    const canvas = globalThis.document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) {
      throw createRawVisualCaptureError(
        "canvas-unavailable",
        "Unable to prepare visual capture canvas."
      );
    }
    context.drawImage(video, 0, 0, width, height);
    const dataUrl = canvas.toDataURL("image/png");
    const base64 = stripPngDataUrlPrefix(dataUrl);
    if (!base64) {
      throw createRawVisualCaptureError(
        "png-encoding-failed",
        "Display capture did not produce PNG data."
      );
    }
    return base64;
  } finally {
    stream.getTracks().forEach((track) => track.stop());
  }
}

function waitForVideoFrame(video: HTMLVideoElement): Promise<void> {
  if (video.videoWidth > 0 && video.videoHeight > 0) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const timeout = globalThis.setTimeout(() => {
      reject(
        createRawVisualCaptureError(
          "display-frame-timeout",
          "Timed out waiting for display capture frame."
        )
      );
    }, 5_000);

    video.onloadedmetadata = () => {
      globalThis.clearTimeout(timeout);
      resolve();
    };
    video.onerror = () => {
      globalThis.clearTimeout(timeout);
      reject(createRawVisualCaptureError("png-encoding-failed", "Display capture video failed."));
    };
  });
}

function isTauriRuntime(): boolean {
  return Boolean((globalThis as { readonly __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__);
}

function createRawVisualCaptureError(
  failureKind: RawVisualCaptureFailureKind,
  message: string
): Error & { readonly failureKind: RawVisualCaptureFailureKind } {
  const error = new Error(message) as Error & {
    failureKind: RawVisualCaptureFailureKind;
  };
  error.failureKind = failureKind;
  return error;
}

function classifyDisplayCaptureStatus(error: unknown): RawVisualCaptureExportStatus {
  return classifyDisplayCaptureFailure(error) === "os-picker-denied-or-cancelled"
    ? "cancelled"
    : "failed";
}

function classifyDisplayCaptureFailure(error: unknown): RawVisualCaptureFailureKind {
  if (hasFailureKind(error)) {
    return error.failureKind;
  }
  if (isDomExceptionName(error, "NotAllowedError") || isDomExceptionName(error, "AbortError")) {
    return "os-picker-denied-or-cancelled";
  }
  return "unknown";
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

function sanitizeFailureDetail(error: unknown): string {
  const raw =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "Raw visual capture failed.";
  return redactSensitiveTextContent(raw).trim().slice(0, 240) || "Raw visual capture failed.";
}

function extractFileName(path: string): string {
  return path.split(/[\\/]/u).filter(Boolean).pop() ?? "raw-visual-capture.png";
}
