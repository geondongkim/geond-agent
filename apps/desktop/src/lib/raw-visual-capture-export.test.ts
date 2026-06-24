import { describe, expect, it } from "vitest";

import {
  createRawVisualCaptureFileName,
  createRawVisualCaptureReadiness,
  stripPngDataUrlPrefix
} from "./raw-visual-capture-export.js";
import type { ProjectedActiveSession } from "./workbench-types.js";

describe("raw visual capture export helpers", () => {
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

  it("strips only PNG data URL prefixes", () => {
    expect(stripPngDataUrlPrefix("data:image/png;base64,aGVsbG8=")).toBe("aGVsbG8=");
    expect(stripPngDataUrlPrefix("data:image/jpeg;base64,aGVsbG8=")).toBeUndefined();
    expect(stripPngDataUrlPrefix("not-base64")).toBeUndefined();
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
