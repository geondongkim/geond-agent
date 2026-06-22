import { describe, expect, it } from "vitest";

import { createUiI18n } from "@geond-agent/ui-workbench";

import {
  formatExternalSessionId,
  formatMessage,
  formatStatusLabel,
  formatUsageCost,
  formatUsageNumber
} from "./workbench-format.js";

describe("desktop workbench formatting helpers", () => {
  it("formats translated status labels without changing unknown status text", () => {
    expect(formatStatusLabel(createUiI18n("en"), "completed")).toBe("completed");
    expect(formatStatusLabel(createUiI18n("ko"), "completed")).toBe("완료");
    expect(formatStatusLabel(createUiI18n("ko"), "custom-status")).toBe("custom-status");
  });

  it("interpolates message placeholders with primitive values", () => {
    expect(formatMessage("Ignored sanitized records: {count}", { count: 3 })).toBe(
      "Ignored sanitized records: 3"
    );
  });

  it("keeps external session identifiers compact for the inspector", () => {
    expect(formatExternalSessionId("1234567890abcdefXYZ")).toBe("12345678...fXYZ");
    expect(formatExternalSessionId("short-id")).toBe("short-id");
  });

  it("uses localized not-available labels for missing usage metadata", () => {
    expect(formatUsageNumber(createUiI18n("ko"), undefined)).toBe("해당 없음");
    expect(formatUsageCost(createUiI18n("en"), undefined)).toBe("n/a");
  });
});
