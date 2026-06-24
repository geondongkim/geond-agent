import { describe, expect, it } from "vitest";

import {
  createScreenshotManifestArtifact,
  createStructuredTraceArtifact
} from "./evidence-capture-export.js";
import type { ProjectedActiveSession } from "./workbench-types.js";

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
});

function createSessionFixture(): ProjectedActiveSession {
  return {
    approvals: [],
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
    providerRouteHealth: [],
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
