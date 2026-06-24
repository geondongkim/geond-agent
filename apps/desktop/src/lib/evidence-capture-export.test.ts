import { describe, expect, it } from "vitest";

import {
  createMultiSessionTraceBundleArtifact,
  createScreenshotManifestArtifact,
  createStructuredTraceArtifact,
  createVisualCapturePolicyArtifact
} from "./evidence-capture-export.js";
import type { ProjectedActiveSession, ProjectedSessionListItem } from "./workbench-types.js";

describe("evidence capture artifact export", () => {
  it("creates metadata-only structured trace artifacts", () => {
    const artifact = createStructuredTraceArtifact({
      activeSession: createSessionFixture(),
      generatedAt: "2026-06-24T00:00:00.000Z"
    });
    const payload = JSON.parse(artifact.text);

    expect(artifact.fileName).toBe("session-with-spaces-structured-trace.json");
    expect(payload).toMatchObject({
      capturePolicy: {
        consent: "explicit-export-action",
        metadataOnly: true,
        rawStoragePolicy: "never-store-raw-by-default",
        redaction: "configured-for-metadata-export"
      },
      kind: "structured-trace",
      schemaVersion: 1
    });
    expect(payload.activeSession.selection).toMatchObject({
      backendAdapterId: "claude-code",
      modelProfileId: "glm-5.2",
      providerRouteId: "zai-anthropic-compatible"
    });
    expect(payload.activeSession.routeHealth).toEqual([
      {
        providerRouteId: "zai-anthropic-compatible",
        latestHealth: "healthy",
        latestIssueKind: "route_reached",
        latestAttemptStatus: "succeeded",
        issueCount: 0,
        modelProfileIds: ["glm-5.2"],
        retryableIssueCount: 0,
        successfulAttemptCount: 1,
        suggestedActions: []
      }
    ]);
    expect(payload.dogfoodWorkflow).toMatchObject({
      liveSucceededCount: 1,
      routeSwitchCandidateCount: 0,
      runAttemptCount: 1
    });
    expect(JSON.stringify(payload)).not.toMatch(
      /ZAI_API_KEY|ANTHROPIC_API_KEY|ANTHROPIC_AUTH_TOKEN|rawLog|transcript|sk-[A-Za-z0-9_-]{20,}/
    );
  });

  it("creates screenshot manifests without bitmap data", () => {
    const artifact = createScreenshotManifestArtifact({
      activeSession: createSessionFixture(),
      generatedAt: "2026-06-24T00:00:00.000Z"
    });
    const payload = JSON.parse(artifact.text);

    expect(artifact.fileName).toBe("session-with-spaces-screenshot-manifest.json");
    expect(payload.kind).toBe("screenshot-manifest");
    expect(payload.note).toContain("does not include image payload data");
    expect(JSON.stringify(payload)).not.toMatch(/data:image|base64|bitmap/i);
  });

  it("creates multi-session trace bundles without raw logs", () => {
    const artifact = createMultiSessionTraceBundleArtifact({
      activeSession: createSessionFixture(),
      generatedAt: "2026-06-24T00:00:00.000Z",
      projectedSessions: createSessionIndexFixture()
    });
    const payload = JSON.parse(artifact.text);

    expect(artifact.fileName).toBe("workbench-multi-session-trace-bundle.json");
    expect(payload).toMatchObject({
      kind: "multi-session-trace-bundle",
      dogfoodWorkflow: {
        attentionSessionCount: 1,
        selectedSessionCount: 2,
        sessionCount: 2
      },
      traceBundle: {
        errorSessionCount: 1,
        pendingApprovalCount: 1,
        resumableSessionCount: 1,
        sessionCount: 2,
        selectedSessionIds: ["session-ok", "session-attention"],
        warningSessionCount: 1
      }
    });
    expect(JSON.stringify(payload)).not.toMatch(
      /ZAI_API_KEY|ANTHROPIC_API_KEY|ANTHROPIC_AUTH_TOKEN|rawLog|transcript|sk-[A-Za-z0-9_-]{20,}/
    );
  });

  it("creates visual capture policy artifacts without image data", () => {
    const artifact = createVisualCapturePolicyArtifact({
      activeSession: createSessionFixture(),
      generatedAt: "2026-06-24T00:00:00.000Z"
    });
    const payload = JSON.parse(artifact.text);

    expect(artifact.fileName).toBe("workbench-visual-capture-policy.json");
    expect(payload.kind).toBe("visual-capture-policy");
    expect(payload.visualCapture.status).toBe("deferred-until-explicit-consent-and-redaction");
    expect(payload.visualCapture.reviewReady).toBe(false);
    expect(payload.visualCapture.missingReviewSteps).toEqual([
      "explicitConsent",
      "redactionReview",
      "storagePathSelected",
      "visibleContentReviewed"
    ]);
    expect(payload.visualCapture.rawImageStorageDefault).toBe("disabled");
    expect(JSON.stringify(payload)).not.toMatch(/data:image|base64/i);
  });

  it("records completed visual capture policy review while requiring per-export path", () => {
    const artifact = createVisualCapturePolicyArtifact({
      activeSession: createSessionFixture(),
      generatedAt: "2026-06-24T00:00:00.000Z",
      visualReview: {
        explicitConsent: true,
        redactionReview: true,
        storagePathSelected: true,
        visibleContentReviewed: true
      }
    });
    const payload = JSON.parse(artifact.text);

    expect(payload.visualCapture.reviewReady).toBe(true);
    expect(payload.visualCapture.missingReviewSteps).toEqual([]);
    expect(payload.visualCapture.status).toBe("policy-reviewed-per-export-capture-gated");
    expect(payload.visualCapture.rawImageStorageDefault).toBe("disabled");
    expect(payload.visualCapture.gate).toMatchObject({
      allowed: false,
      status: "blocked-missing-storage-path",
      storagePathState: "missing"
    });
  });
});

function createSessionIndexFixture(): readonly ProjectedSessionListItem[] {
  return [
    {
      errorCount: 0,
      id: "session-ok",
      lifecycle: "completed",
      pendingApprovalCount: 0,
      providerKeyMissing: false,
      resumable: false,
      title: "Finished session",
      warningCount: 0,
      workspacePath: "/Users/example/project"
    },
    {
      backendAdapterId: "claude-code",
      backendLabel: "Claude Code",
      capabilityWarning: "Route attention",
      errorCount: 1,
      id: "session-attention",
      lifecycle: "failed",
      pendingApprovalCount: 1,
      providerKeyMissing: false,
      providerRouteLabel: "Z.ai",
      resumable: true,
      title: "Attention session",
      updatedAt: "2026-06-24T00:00:00.000Z",
      warningCount: 1,
      workspacePath: "/Users/example/project"
    }
  ] as unknown as readonly ProjectedSessionListItem[];
}

function createSessionFixture(): ProjectedActiveSession {
  return {
    approvals: [],
    artifacts: [],
    assistantMessages: [],
    commandOutputs: [
      {
        chunkCount: 3,
        exitCode: 0,
        id: "cmd-1",
        preview: "this preview must not be exported",
        status: "completed"
      }
    ],
    contextAttachments: [
      {
        contentState: "metadata-only",
        id: "ctx-1",
        kind: "workspace",
        path: "/Users/example/project",
        provenance: "desktop",
        title: "project"
      }
    ],
    diffs: [
      {
        files: [
          {
            additions: 10,
            changeKind: "modified",
            deletions: 2,
            path: "apps/desktop/src/app.tsx"
          }
        ],
        id: "diff-1",
        title: "Desktop UI"
      }
    ],
    externalSessions: {},
    id: "session with spaces",
    lifecycle: "running",
    liveRunContinuity: {} as ProjectedActiveSession["liveRunContinuity"],
    liveRunGuidance: {} as ProjectedActiveSession["liveRunGuidance"],
    notices: [],
    plan: undefined,
    providerRouteHealth: [
      {
        issueCount: 0,
        latestAttemptStatus: "succeeded",
        latestHealth: "healthy",
        latestIssueKind: "route_reached",
        modelProfileIds: ["glm-5.2"],
        providerRouteId: "zai-anthropic-compatible",
        retryableIssueCount: 0,
        successfulAttemptCount: 1,
        suggestedActions: []
      }
    ],
    runnerIssues: [],
    runAttempts: [
      {
        eventCount: 12,
        id: "attempt-1",
        ignoredRecordCount: 0,
        mode: "claude-live",
        parseWarningCount: 0,
        status: "succeeded"
      }
    ],
    selection: {
      backendAdapterId: "claude-code",
      modelProfileId: "glm-5.2",
      providerRouteId: "zai-anthropic-compatible",
      routingMode: "manual"
    },
    timeline: [],
    title: "Live route",
    toolCalls: [],
    usageReports: [],
    workspacePath: "/Users/example/project"
  } as unknown as ProjectedActiveSession;
}
