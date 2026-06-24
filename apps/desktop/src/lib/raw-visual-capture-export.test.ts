import { beforeEach, describe, expect, it, vi } from "vitest";

const tauriMocks = vi.hoisted(() => ({
  invoke: vi.fn(),
  save: vi.fn()
}));

vi.mock("@tauri-apps/api/core", () => ({
  invoke: tauriMocks.invoke
}));

vi.mock("@tauri-apps/plugin-dialog", () => ({
  save: tauriMocks.save
}));

import {
  createRawVisualCaptureArtifactReference,
  createRawVisualCaptureFileName,
  createRawVisualCaptureReadiness,
  exportRawVisualCapturePng
} from "./raw-visual-capture-export.js";
import type { ProjectedActiveSession } from "./workbench-types.js";

describe("raw visual capture export helpers", () => {
  beforeEach(() => {
    tauriMocks.invoke.mockReset();
    tauriMocks.save.mockReset();
    delete (globalThis as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__;
  });

  it("requires review checks before capture can be requested", () => {
    const readiness = createRawVisualCaptureReadiness({
      activeSession: { id: "session-1" } as ProjectedActiveSession,
      visualReview: {
        explicitConsent: true,
        redactionReview: false,
        storagePathSelected: false,
        visibleContentReviewed: true
      }
    });

    expect(readiness.canRequestCapture).toBe(false);
    expect(readiness.gate.allowed).toBe(false);
    expect(readiness.gate.missingSteps).toContain("redactionReview");
    expect(readiness.gate.missingSteps).toContain("storagePath");
  });

  it("keeps capture disabled until the storage-path review check is complete", () => {
    const readiness = createRawVisualCaptureReadiness({
      activeSession: { id: "session-1" } as ProjectedActiveSession,
      visualReview: {
        explicitConsent: true,
        redactionReview: true,
        storagePathSelected: false,
        visibleContentReviewed: true
      }
    });

    expect(readiness.canRequestCapture).toBe(false);
    expect(readiness.gate.allowed).toBe(false);
    expect(readiness.gate.status).toBe("blocked-missing-storage-path");
  });

  it("marks capture requestable when review is complete even though native save path is still pending", () => {
    const readiness = createRawVisualCaptureReadiness({
      activeSession: { id: "session-1" } as ProjectedActiveSession,
      visualReview: {
        explicitConsent: true,
        redactionReview: true,
        storagePathSelected: true,
        visibleContentReviewed: true
      }
    });

    expect(readiness.canRequestCapture).toBe(true);
    expect(readiness.gate.allowed).toBe(false);
    expect(readiness.gate.status).toBe("blocked-missing-storage-path");
  });

  it("returns a specific unsupported reason outside the native desktop runtime", async () => {
    await expect(
      exportRawVisualCapturePng({
        activeSession: { id: "session-1" } as ProjectedActiveSession,
        visualReview: {
          explicitConsent: true,
          redactionReview: true,
          storagePathSelected: true,
          visibleContentReviewed: true
        }
      })
    ).resolves.toMatchObject({
      status: "unsupported",
      failureKind: "native-runtime-required"
    });
  });

  it("delegates native desktop capture to the Tauri command without renderer pixels", async () => {
    Object.defineProperty(globalThis, "__TAURI_INTERNALS__", {
      configurable: true,
      value: {}
    });
    tauriMocks.save.mockResolvedValue("/tmp/geond-agent-visual-capture.png");
    tauriMocks.invoke.mockResolvedValue(undefined);

    await expect(
      exportRawVisualCapturePng({
        activeSession: { id: "session-1", title: "Native capture" } as ProjectedActiveSession,
        now: new Date("2026-06-24T00:00:00.000Z"),
        visualReview: {
          explicitConsent: true,
          redactionReview: true,
          storagePathSelected: true,
          visibleContentReviewed: true
        }
      })
    ).resolves.toMatchObject({
      status: "saved",
      path: "/tmp/geond-agent-visual-capture.png",
      artifactRef: {
        payloadPersistedInWorkbench: false,
        storagePolicy: "user-selected-path-only"
      }
    });

    expect(tauriMocks.save).toHaveBeenCalledWith(
      expect.objectContaining({
        filters: [{ name: "PNG image", extensions: ["png"] }]
      })
    );
    expect(tauriMocks.invoke).toHaveBeenCalledWith("capture_raw_visual_png", {
      path: "/tmp/geond-agent-visual-capture.png",
      sessionId: "session-1",
      explicitConsent: true,
      redactionReview: true,
      visibleContentReviewed: true
    });
    expect(tauriMocks.invoke).not.toHaveBeenCalledWith(
      "write_raw_visual_capture_png",
      expect.anything()
    );
  });

  it("classifies native capture availability failures separately from legacy display capture", async () => {
    Object.defineProperty(globalThis, "__TAURI_INTERNALS__", {
      configurable: true,
      value: {}
    });
    tauriMocks.save.mockResolvedValue("/tmp/geond-agent-visual-capture.png");
    tauriMocks.invoke.mockRejectedValue(
      "native-capture-unavailable: Raw visual capture is only available on macOS in this build."
    );

    await expect(
      exportRawVisualCapturePng({
        activeSession: { id: "session-1" } as ProjectedActiveSession,
        visualReview: {
          explicitConsent: true,
          redactionReview: true,
          storagePathSelected: true,
          visibleContentReviewed: true
        }
      })
    ).resolves.toMatchObject({
      status: "unsupported",
      failureKind: "native-capture-unavailable"
    });
  });

  it("normalizes legacy display-capture failures into the native capture bridge status", async () => {
    Object.defineProperty(globalThis, "__TAURI_INTERNALS__", {
      configurable: true,
      value: {}
    });
    tauriMocks.save.mockResolvedValue("/tmp/geond-agent-visual-capture.png");
    tauriMocks.invoke.mockRejectedValue(
      "Display capture is not available in this desktop webview runtime; a native capture bridge is required before the OS picker can open."
    );

    await expect(
      exportRawVisualCapturePng({
        activeSession: { id: "session-1" } as ProjectedActiveSession,
        visualReview: {
          explicitConsent: true,
          redactionReview: true,
          storagePathSelected: true,
          visibleContentReviewed: true
        }
      })
    ).resolves.toMatchObject({
      status: "unsupported",
      failureKind: "native-capture-unavailable",
      detail: "Native raw visual capture is unavailable in this desktop runtime."
    });
  });

  it("creates path-only raw visual artifact references", () => {
    const reference = createRawVisualCaptureArtifactReference({
      activeSession: {
        id: "session-1",
        title: "Claude dogfood"
      } as ProjectedActiveSession,
      capturedAt: "2026-06-24T00:00:00.000Z",
      path: "/Users/example/Desktop/capture.png",
      visualReview: {
        explicitConsent: true,
        redactionReview: true,
        storagePathSelected: true,
        visibleContentReviewed: true
      }
    });

    expect(reference).toMatchObject({
      id: "session-1:2026-06-24T00:00:00.000Z:capture.png",
      fileName: "capture.png",
      path: "/Users/example/Desktop/capture.png",
      payloadPersistedInWorkbench: false,
      storagePolicy: "user-selected-path-only"
    });
    expect(JSON.stringify(reference)).not.toMatch(/data:image|base64/i);
  });

  it("creates stable raw visual capture file names", () => {
    expect(
      createRawVisualCaptureFileName({
        activeSession: { title: "Live Claude / Route?" } as ProjectedActiveSession,
        now: new Date("2026-06-24T00:00:00.000Z")
      })
    ).toBe("2026-06-24-live-claude-route-raw-visual-capture.png");
  });
});
