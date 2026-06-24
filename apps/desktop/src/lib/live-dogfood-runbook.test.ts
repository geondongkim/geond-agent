import { describe, expect, it } from "vitest";

import {
  createLiveDogfoodRunbook,
  formatLiveDogfoodRunbookForReport
} from "./live-dogfood-runbook.js";
import type { ProjectedActiveSession, ProjectedSessionListItem } from "./workbench-types.js";

describe("live dogfood runbook", () => {
  it("marks route switching, retry, cancel, resume, and raw visual gates from projected metadata", () => {
    const runbook = createLiveDogfoodRunbook({
      activeSession: {
        id: "session-1",
        liveRunContinuity: {
          latestAttemptId: "attempt-resume",
          latestAttemptStatus: "succeeded",
          latestExternalSessionId: "00000000-0000-4000-8000-000000000001",
          latestStreamQuality: "clean",
          totalAttemptCount: 4,
          resumeAttemptCount: 1,
          approvalFollowUpAttemptCount: 0,
          cleanStreamAttemptCount: 2,
          warningStreamAttemptCount: 1
        },
        liveRunGuidance: {
          canResume: false,
          kind: "healthy",
          nextActions: ["review_evidence"],
          severity: "success",
          streamQuality: "clean"
        },
        providerRouteHealth: [
          {
            issueCount: 1,
            latestHealth: "degraded",
            modelProfileIds: ["glm-5.2"],
            providerRouteId: "zai-anthropic-compatible",
            retryableIssueCount: 1,
            successfulAttemptCount: 1,
            suggestedActions: ["switch_route"]
          }
        ],
        runnerIssues: [
          {
            id: "issue-1",
            kind: "provider_overloaded",
            message: "Provider overloaded.",
            retryable: true,
            severity: "error",
            suggestedAction: "retry_later",
            title: "Provider overloaded"
          }
        ],
        runAttempts: [
          {
            id: "attempt-resume",
            mode: "claude-live",
            parentRunAttemptId: "attempt-failed",
            status: "succeeded",
            trigger: "manual_resume"
          },
          {
            id: "attempt-cancelled",
            mode: "claude-live",
            status: "cancelled"
          },
          {
            failureKind: "provider_overloaded",
            id: "attempt-failed",
            mode: "claude-live",
            status: "failed"
          }
        ],
        workspacePath: "/Users/example/project"
      } as unknown as ProjectedActiveSession,
      generatedAt: "2026-06-24T00:00:00.000Z",
      projectedSessions: [
        {
          errorCount: 1,
          id: "session-1",
          lifecycle: "failed",
          pendingApprovalCount: 0,
          resumable: true,
          title: "Live route",
          warningCount: 0
        }
      ] as unknown as readonly ProjectedSessionListItem[],
      visualReview: {
        explicitConsent: true,
        redactionReview: true,
        storagePathSelected: true,
        visibleContentReviewed: true
      }
    });

    expect(runbook.steps.map((step) => [step.id, step.status])).toEqual([
      ["route_switch", "attention"],
      ["retry", "observed"],
      ["cancel", "observed"],
      ["resume", "observed"],
      ["evidence_export", "attention"],
      ["raw_visual_capture", "blocked"]
    ]);
    expect(runbook.rawVisualCaptureGate.status).toBe("blocked-implementation-disabled");
    expect(formatLiveDogfoodRunbookForReport(runbook).join("\n")).toContain(
      "Manual route switch: attention"
    );
  });

  it("keeps an empty workbench pending until live metadata exists", () => {
    const runbook = createLiveDogfoodRunbook({
      generatedAt: "2026-06-24T00:00:00.000Z",
      projectedSessions: []
    });

    expect(runbook.steps.map((step) => step.status)).toEqual([
      "pending",
      "pending",
      "pending",
      "pending",
      "ready",
      "blocked"
    ]);
  });
});
