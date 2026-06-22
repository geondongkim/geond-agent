import { describe, expect, it } from "vitest";

import {
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
        usageReports: []
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
});
