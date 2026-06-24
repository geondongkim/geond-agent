import { describe, expect, it } from "vitest";

import {
  defaultEvidenceExportPreferences,
  normalizeEvidenceExportPreferences,
  saveEvidenceExportPreferences,
  loadEvidenceExportPreferences
} from "./evidence-export-preferences.js";

describe("evidence export preferences", () => {
  it("normalizes export scope and visual review state without raw evidence", () => {
    const preferences = normalizeEvidenceExportPreferences({
      exportScopeMode: "custom",
      selectedSessionIds: ["session-1", "session-1", " ", "session-2"],
      visualReview: {
        explicitConsent: true,
        redactionReview: "yes",
        storagePathSelected: true,
        visibleContentReviewed: false
      },
      visualReviewUpdatedAt: "2026-06-24T00:00:00.000Z",
      rawScreenshot: "data:image/png;base64,secret",
      token: "should-not-survive"
    });

    expect(preferences).toEqual({
      exportScopeMode: "custom",
      selectedSessionIds: ["session-1", "session-2"],
      visualReview: {
        explicitConsent: true,
        redactionReview: false,
        storagePathSelected: true,
        visibleContentReviewed: false
      },
      visualReviewUpdatedAt: "2026-06-24T00:00:00.000Z"
    });
    expect(JSON.stringify(preferences)).not.toMatch(/data:image|token|secret/i);
  });

  it("loads defaults when persisted JSON is missing or malformed", async () => {
    expect(normalizeEvidenceExportPreferences("not-an-object")).toEqual(
      defaultEvidenceExportPreferences()
    );
    await expect(loadEvidenceExportPreferences(createMemoryStore("{"))).resolves.toEqual(
      defaultEvidenceExportPreferences()
    );
  });

  it("saves normalized local-only preferences through the settings store", async () => {
    const store = createMemoryStore();
    await saveEvidenceExportPreferences(store, {
      exportScopeMode: "attention",
      selectedSessionIds: ["session-attention"],
      visualReview: {
        explicitConsent: true,
        redactionReview: true,
        storagePathSelected: true,
        visibleContentReviewed: true
      },
      visualReviewUpdatedAt: "2026-06-24T01:00:00.000Z"
    });

    const loaded = await loadEvidenceExportPreferences(store);

    expect(loaded.exportScopeMode).toBe("attention");
    expect(loaded.selectedSessionIds).toEqual(["session-attention"]);
    expect(loaded.visualReview.visibleContentReviewed).toBe(true);
  });
});

function createMemoryStore(initial?: string) {
  let value: string | null = initial ?? null;
  return {
    getItem: async () => value,
    setItem: async (_key: string, nextValue: string) => {
      value = nextValue;
    },
    removeItem: async () => {
      value = null;
    }
  };
}
