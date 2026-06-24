import { describe, expect, it } from "vitest";

import {
  createDogfoodWorkflowSummary,
  formatDogfoodWorkflowSummaryForReport
} from "./dogfood-workflow-summary.js";
import type { ProjectedActiveSession, ProjectedSessionListItem } from "./workbench-types.js";

describe("dogfood workflow summary", () => {
  it("rolls up selected sessions, live attempts, route health, and visual review readiness", () => {
    const summary = createDogfoodWorkflowSummary({
      activeSession: {
        providerRouteHealth: [
          {
            issueCount: 1,
            latestHealth: "degraded",
            modelProfileIds: ["glm-5.2"],
            providerRouteId: "zai.anthropic-compatible",
            retryableIssueCount: 1,
            successfulAttemptCount: 0,
            suggestedActions: ["switch_route"]
          }
        ],
        runnerIssues: [
          {
            id: "issue-1",
            kind: "provider_overloaded",
            severity: "error",
            title: "Provider overloaded",
            message: "529",
            retryable: true,
            suggestedAction: "retry_later",
            providerRouteId: "zai.anthropic-compatible"
          }
        ],
        runAttempts: [
          {
            id: "attempt-ok",
            mode: "claude-live",
            status: "succeeded"
          },
          {
            id: "attempt-failed",
            mode: "claude-live",
            status: "failed",
            failureKind: "provider_overloaded"
          }
        ]
      } as unknown as ProjectedActiveSession,
      selectedSessions: [
        {
          errorCount: 1,
          id: "session-a",
          lifecycle: "failed",
          pendingApprovalCount: 0,
          resumable: true,
          title: "Attention",
          warningCount: 0
        }
      ] as unknown as readonly ProjectedSessionListItem[],
      sessions: [
        {
          errorCount: 1,
          id: "session-a",
          lifecycle: "failed",
          pendingApprovalCount: 0,
          resumable: true,
          title: "Attention",
          warningCount: 0
        },
        {
          errorCount: 0,
          id: "session-b",
          lifecycle: "completed",
          pendingApprovalCount: 0,
          resumable: false,
          title: "Clean",
          warningCount: 0
        }
      ] as unknown as readonly ProjectedSessionListItem[],
      visualReview: {
        explicitConsent: true,
        redactionReview: false,
        storagePathSelected: true,
        visibleContentReviewed: false
      }
    });

    expect(summary).toMatchObject({
      attentionSessionCount: 1,
      degradedRouteCount: 1,
      liveFailedCount: 1,
      liveSucceededCount: 1,
      routeSwitchCandidateCount: 1,
      selectedSessionCount: 1,
      sessionCount: 2,
      visualReviewReady: false
    });
    expect(summary.missingVisualReviewSteps).toEqual([
      "redactionReview",
      "visibleContentReviewed"
    ]);
    expect(summary.recommendedActions).toEqual([
      "manual_route_switch_review",
      "retry_resume_review",
      "multi_session_issue_report",
      "visual_capture_policy_review"
    ]);
    expect(formatDogfoodWorkflowSummaryForReport(summary).join("\n")).toContain(
      "route switch candidates: 1"
    );
  });

  it("recommends continuing dogfood when no attention signals are present", () => {
    const summary = createDogfoodWorkflowSummary({
      sessions: [],
      visualReview: {
        explicitConsent: true,
        redactionReview: true,
        storagePathSelected: true,
        visibleContentReviewed: true
      }
    });

    expect(summary.recommendedActions).toEqual(["continue_dogfood"]);
    expect(summary.visualReviewReady).toBe(true);
  });
});
