import { describe, expect, it } from "vitest";

import {
  createEvidenceCaptureReadiness,
  formatEvidenceCaptureReadinessForManifest
} from "./evidence-capture.js";

describe("evidence capture readiness", () => {
  it("blocks screenshots and traces until explicit consent exists", () => {
    const readiness = createEvidenceCaptureReadiness();

    expect(readiness).toHaveLength(2);
    expect(readiness.map((item) => item.status)).toEqual([
      "requires-explicit-consent",
      "requires-explicit-consent"
    ]);
    expect(readiness.every((item) => item.rawStoragePolicy === "never-store-raw-by-default")).toBe(
      true
    );
  });

  it("separates consent from redaction readiness", () => {
    expect(
      createEvidenceCaptureReadiness({ consentGranted: true }).map((item) => item.status)
    ).toEqual(["redaction-not-configured", "redaction-not-configured"]);
    expect(
      createEvidenceCaptureReadiness({
        consentGranted: true,
        redactionConfigured: true,
        screenshotCount: 1,
        structuredTraceCount: 2
      }).map((item) => item.status)
    ).toEqual(["ready-for-export", "ready-for-export"]);
  });

  it("formats manifest lines without raw data", () => {
    const lines = formatEvidenceCaptureReadinessForManifest(
      createEvidenceCaptureReadiness({ screenshotCount: 3 })
    );

    expect(lines.join("\n")).toContain("Screenshot bundle: requires-explicit-consent");
    expect(lines.join("\n")).toContain("captured=3");
    expect(lines.join("\n")).toContain("raw=never-store-raw-by-default");
    expect(lines.join("\n")).not.toContain("base64");
  });
});
