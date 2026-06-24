import { describe, expect, it } from "vitest";

import { createUiI18n } from "@geond-agent/ui-workbench";

import {
  formatExternalSessionId,
  formatLiveRunGuidanceDetail,
  formatLiveRunGuidanceLabel,
  formatLiveRunNextActionLabel,
  formatMessage,
  formatRunAttemptTriggerLabel,
  formatSelectionReadinessDetail,
  formatSelectionReadinessLevelLabel,
  formatStatusLabel,
  formatStreamQualityLabel,
  liveRunGuidanceTone,
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
    expect(formatUsageNumber(createUiI18n("en"), null)).toBe("n/a");
    expect(formatUsageNumber(createUiI18n("en"), Number.NaN)).toBe("n/a");
    expect(formatUsageCost(createUiI18n("en"), undefined)).toBe("n/a");
    expect(formatUsageCost(createUiI18n("ko"), null)).toBe("해당 없음");
  });

  it("formats run trigger and stream quality labels", () => {
    expect(formatRunAttemptTriggerLabel(createUiI18n("en"), "approval_follow_up")).toBe(
      "Approval follow-up"
    );
    expect(formatRunAttemptTriggerLabel(createUiI18n("ko"), "manual_resume")).toBe(
      "수동 이어쓰기"
    );
    expect(formatStreamQualityLabel(createUiI18n("en"), "warning")).toBe("Warning");
    expect(formatStreamQualityLabel(createUiI18n("ko"), "clean")).toBe("정상");
  });

  it("formats live run guidance labels, detail, and tone", () => {
    expect(formatLiveRunGuidanceLabel(createUiI18n("en"), "retry_later")).toBe("Retry later");
    expect(formatLiveRunGuidanceLabel(createUiI18n("ko"), "healthy")).toBe("다음 단계 진행 가능");
    expect(formatLiveRunGuidanceDetail(createUiI18n("en"), "resume_available")).toContain(
      "linked external session"
    );
    expect(liveRunGuidanceTone("success")).toBe("status-ok");
    expect(liveRunGuidanceTone("error")).toBe("status-danger");
    expect(formatLiveRunNextActionLabel(createUiI18n("en"), "resume_session")).toBe(
      "Resume the linked Claude session"
    );
    expect(formatLiveRunNextActionLabel(createUiI18n("ko"), "queue_recovery_brief")).toBe(
      "복구 초안 추가"
    );
  });

  it("formats selection readiness level and non-ready detail", () => {
    expect(formatSelectionReadinessLevelLabel(createUiI18n("ko"), "blocked")).toBe("차단됨");
    expect(
      formatSelectionReadinessDetail({
        level: "blocked",
        summary: "1 readiness blocker must be resolved before live execution.",
        items: [
          {
            id: "provider-route",
            label: "Z.ai route",
            level: "blocked",
            reason: "API key presence is missing."
          },
          {
            id: "routing-mode",
            label: "Manual routing",
            level: "ready"
          }
        ]
      })
    ).toBe(
      "1 readiness blocker must be resolved before live execution. | Z.ai route: API key presence is missing."
    );
  });
});
