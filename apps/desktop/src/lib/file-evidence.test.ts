import { describe, expect, it } from "vitest";

import {
  createEvidenceBundleDraft,
  createEvidenceBundleFileName,
  createEvidenceReportDraft,
  createEvidenceFollowUpDraft,
  createFileEvidencePreviewModel,
  findFileEvidenceSelection,
  formatDiffStat,
  formatEvidenceRange
} from "./file-evidence.js";
import type { InspectorSessionReadModel } from "./inspector-read-model.js";
import type { ProjectedActiveSession } from "./workbench-types.js";

describe("file evidence preview model", () => {
  it("combines context attachments and diff files without raw file content", () => {
    const model = createFileEvidencePreviewModel({
      activeSession: {
        contextAttachments: [
          {
            id: "context-workspace",
            kind: "workspace",
            title: "geond-agent",
            provenance: "desktop",
            contentState: "metadata-only",
            path: "/workspace/geond-agent",
            summary: "Workspace metadata only"
          }
        ],
        diffs: [
          {
            id: "diff-1",
            title: "Desktop polish",
            summary: "Updated files panel",
            files: [
              {
                path: "apps/desktop/src/panes/inspector.tsx",
                changeKind: "modified",
                additions: 12,
                deletions: 3
              }
            ]
          }
        ]
      } as unknown as ProjectedActiveSession
    });

    expect(model.contextCount).toBe(1);
    expect(model.changedFileCount).toBe(1);
    expect(model.contextItems[0]).toMatchObject({
      contentState: "metadata-only",
      summary: "Workspace metadata only"
    });
    expect(model.changedFileItems[0]).toMatchObject({
      diffId: "diff-1",
      path: "apps/desktop/src/panes/inspector.tsx",
      additions: 12,
      deletions: 3
    });
    expect(JSON.stringify(model)).not.toContain("raw");
  });

  it("prefers materialized inspector records when available", () => {
    const model = createFileEvidencePreviewModel({
      activeSession: {
        contextAttachments: [
          {
            id: "context-projection",
            kind: "workspace",
            title: "Projection",
            provenance: "desktop",
            contentState: "metadata-only"
          }
        ],
        diffs: []
      } as unknown as ProjectedActiveSession,
      inspectorData: {
        contextAttachments: [
          {
            id: "context-materialized",
            kind: "file",
            title: "architecture.md",
            provenance: "desktop",
            contentState: "metadata-only"
          }
        ],
        diffs: [],
        commandOutputs: [],
        sessionId: "session-a",
        source: "materialized",
        toolCalls: [],
        usageReports: [],
        runAttempts: []
      } as InspectorSessionReadModel
    });

    expect(model.contextItems).toHaveLength(1);
    expect(model.contextItems[0]?.id).toBe("context-materialized");
  });

  it("formats metadata ranges and diff stats", () => {
    expect(formatEvidenceRange({ startLine: 10, startColumn: 2, endLine: 12 })).toBe(
      "L10:2-L12"
    );
    expect(formatDiffStat({ additions: 3, deletions: 1 })).toBe("+3 / -1");
  });

  it("selects evidence items and creates follow-up drafts", () => {
    const model = createFileEvidencePreviewModel({
      activeSession: {
        contextAttachments: [
          {
            id: "context-workspace",
            kind: "workspace",
            title: "geond-agent",
            provenance: "desktop",
            contentState: "metadata-only",
            path: "/workspace/geond-agent"
          }
        ],
        diffs: [
          {
            id: "diff-1",
            files: [
              {
                path: "apps/desktop/src/app.tsx",
                changeKind: "modified",
                additions: 12,
                deletions: 3
              }
            ],
            summary: "Updated the app shell"
          }
        ]
      } as unknown as ProjectedActiveSession
    });

    const defaultSelection = findFileEvidenceSelection(model, undefined);
    expect(defaultSelection?.type).toBe("changed-file");
    expect(createEvidenceFollowUpDraft(defaultSelection!)).toContain("apps/desktop/src/app.tsx");

    const contextSelection = findFileEvidenceSelection(model, "context-workspace");
    expect(contextSelection?.type).toBe("context");
    expect(createEvidenceFollowUpDraft(contextSelection!)).toContain("/workspace/geond-agent");
  });

  it("creates a metadata-only evidence bundle and redacts sensitive previews", () => {
    const sensitiveValue = ["sk", "local", "123456789012345678901234567890"].join("-");
    const sensitiveEnvName = ["ANTHROPIC", "API", "KEY"].join("_");
    const bundle = createEvidenceBundleDraft({
      activeSession: {
        id: "session-1",
        title: "Claude dogfood",
        workspacePath: "/workspace/geond-agent",
        selection: {
          backendAdapterId: "claude-code.external-cli-acp",
          providerRouteId: "zai.anthropic-compatible",
          modelProfileId: "sonnet",
          routingMode: "manual"
        },
        contextAttachments: [
          {
            id: "context-file",
            kind: "file",
            title: "architecture.md",
            provenance: "desktop",
            contentState: "metadata-only",
            path: "/workspace/geond-agent/docs/architecture.md",
            summary: `Route notes ${sensitiveValue}`
          }
        ],
        commandOutputs: [
          {
            id: "cmd-1",
            status: "failed",
            exitCode: 1,
            preview: `${sensitiveEnvName}=${sensitiveValue}`,
            chunkCount: 1
          }
        ],
        diffs: [
          {
            id: "diff-1",
            summary: "Settings UI hardening",
            files: [
              {
                path: "apps/desktop/src/app.tsx",
                changeKind: "modified",
                additions: 4,
                deletions: 1
              }
            ]
          }
        ],
        runAttempts: [
          {
            id: "attempt-1",
            mode: "claude-live",
            status: "failed",
            modelProfileId: "sonnet",
            trigger: "manual",
            failureKind: "provider_auth",
            errorMessage: `provider rejected ${sensitiveValue}`
          }
        ]
      } as unknown as ProjectedActiveSession
    });

    expect(bundle).toContain("Workbench evidence bundle (metadata only).");
    expect(bundle).toContain("Raw private file contents");
    expect(bundle).toContain("apps/desktop/src/app.tsx");
    expect(bundle).toContain("Command outputs (1)");
    expect(bundle).not.toContain(sensitiveValue);
    expect(bundle).toContain("[redacted]");
  });

  it("creates stable markdown evidence bundle filenames", () => {
    expect(
      createEvidenceBundleFileName({
        activeSession: {
          id: "session-1",
          title: "Claude Dogfood: retry/resume!"
        } as unknown as ProjectedActiveSession,
        now: new Date("2026-06-23T00:00:00.000Z")
      })
    ).toBe("2026-06-23-claude-dogfood-retry-resume-evidence.md");
  });

  it("creates an issue/report draft around the metadata-only evidence bundle", () => {
    const report = createEvidenceReportDraft({
      activeSession: {
        id: "session-1",
        title: "Claude dogfood",
        workspacePath: "/workspace/geond-agent",
        contextAttachments: [],
        commandOutputs: [],
        diffs: [],
        runAttempts: []
      } as unknown as ProjectedActiveSession
    });

    expect(report).toContain("Workbench dogfood report for Claude dogfood");
    expect(report).toContain("Suggested checks");
    expect(report).toContain("Workbench evidence bundle (metadata only).");
    expect(report).toContain("raw Claude logs");
  });
});
