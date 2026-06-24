import { describe, expect, it } from "vitest";

import {
  createRawVisualCaptureGate,
  formatRawVisualCaptureGateForReport
} from "./raw-visual-capture-gate.js";
import type { ProjectedActiveSession } from "./workbench-types.js";

describe("raw visual capture gate", () => {
  it("blocks raw capture until review, session, storage, and implementation gates pass", () => {
    const gate = createRawVisualCaptureGate({});

    expect(gate.allowed).toBe(false);
    expect(gate.status).toBe("blocked-missing-session");
    expect(gate.missingSteps).toEqual([
      "explicitConsent",
      "redactionReview",
      "visibleContentReviewed",
      "storagePathSelected",
      "storagePath",
      "activeSession",
      "rawCaptureImplementation"
    ]);
    expect(formatRawVisualCaptureGateForReport(gate).join("\n")).toContain(
      "raw capture allowed: no"
    );
  });

  it("keeps capture blocked when policy is reviewed but raw implementation is disabled", () => {
    const gate = createRawVisualCaptureGate({
      activeSession: { id: "session-1" } as ProjectedActiveSession,
      storagePath: "/Users/example/Desktop/capture.png",
      visualReview: {
        explicitConsent: true,
        redactionReview: true,
        storagePathSelected: false,
        visibleContentReviewed: true
      }
    });

    expect(gate).toMatchObject({
      allowed: false,
      status: "blocked-implementation-disabled",
      storagePathState: "user-selected"
    });
    expect(gate.review.storagePathSelected).toBe(true);
    expect(gate.missingSteps).toEqual(["rawCaptureImplementation"]);
  });

  it("allows capture only when the implementation gate is explicitly enabled", () => {
    const gate = createRawVisualCaptureGate({
      activeSession: { id: "session-1" } as ProjectedActiveSession,
      rawCaptureImplementationEnabled: true,
      storagePath: "/Users/example/Desktop/capture.png",
      visualReview: {
        explicitConsent: true,
        redactionReview: true,
        storagePathSelected: true,
        visibleContentReviewed: true
      }
    });

    expect(gate.allowed).toBe(true);
    expect(gate.status).toBe("allowed");
    expect(gate.missingSteps).toEqual([]);
  });
});
