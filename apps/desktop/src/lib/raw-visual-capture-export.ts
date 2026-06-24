import { invoke } from "@tauri-apps/api/core";
import { save } from "@tauri-apps/plugin-dialog";

import {
  createRawVisualCaptureGate,
  type RawVisualCaptureGate,
  type RawVisualCaptureGateOptions
} from "./raw-visual-capture-gate.js";
import type { VisualCaptureReviewState } from "./evidence-capture-export.js";
import type { ProjectedActiveSession } from "./workbench-types.js";

export type RawVisualCaptureExportResult =
  | "saved"
  | "cancelled"
  | "blocked"
  | "unsupported"
  | "failed";

export interface RawVisualCaptureExportOptions {
  readonly activeSession?: ProjectedActiveSession;
  readonly fileName?: string;
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
  title,
  visualReview
}: RawVisualCaptureExportOptions): Promise<RawVisualCaptureExportResult> {
  if (!activeSession) {
    return "blocked";
  }
  if (!isTauriRuntime()) {
    return "unsupported";
  }

  const path = await requestRawVisualCapturePath(fileName, title);
  if (!path) {
    return "cancelled";
  }

  const gate = createRawVisualCaptureGate({
    activeSession,
    rawCaptureImplementationEnabled: true,
    requireStoragePathValue: true,
    storagePath: path,
    visualReview
  });
  if (!gate.allowed) {
    return "blocked";
  }

  try {
    const pngBase64 = await captureDisplayFrameAsPngBase64();
    await invoke("write_raw_visual_capture_png", {
      path,
      sessionId: activeSession.id,
      pngBase64,
      explicitConsent: visualReview.explicitConsent,
      redactionReview: visualReview.redactionReview,
      visibleContentReviewed: visualReview.visibleContentReviewed
    });
    return "saved";
  } catch {
    return "failed";
  }
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
    throw new Error("Display capture is not available in this runtime.");
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
      throw new Error("Unable to prepare visual capture canvas.");
    }
    context.drawImage(video, 0, 0, width, height);
    const dataUrl = canvas.toDataURL("image/png");
    const base64 = stripPngDataUrlPrefix(dataUrl);
    if (!base64) {
      throw new Error("Display capture did not produce PNG data.");
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
      reject(new Error("Timed out waiting for display capture frame."));
    }, 5_000);

    video.onloadedmetadata = () => {
      globalThis.clearTimeout(timeout);
      resolve();
    };
    video.onerror = () => {
      globalThis.clearTimeout(timeout);
      reject(new Error("Display capture video failed to load."));
    };
  });
}

function isTauriRuntime(): boolean {
  return Boolean((globalThis as { readonly __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__);
}
