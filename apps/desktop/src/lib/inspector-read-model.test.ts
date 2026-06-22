import { describe, expect, it } from "vitest";
import {
  createMaterializedInspectorSessionReadModel,
  createProjectionInspectorSessionReadModel
} from "./inspector-read-model.js";
import type { ProjectedActiveSession } from "./workbench-types.js";

const fallbackSession = {
  id: "session-a",
  contextAttachments: [
    {
      id: "context-projection",
      kind: "workspace",
      title: "Projection workspace",
      provenance: "desktop",
      contentState: "metadata-only"
    }
  ],
  toolCalls: [],
  commandOutputs: [
    {
      id: "cmd-projection",
      status: "running",
      preview: "projection",
      chunkCount: 1
    }
  ],
  diffs: [],
  usageReports: []
} as unknown as ProjectedActiveSession;

describe("inspector read model", () => {
  it("uses replay projection as the renderer-only fallback", () => {
    const model = createProjectionInspectorSessionReadModel(fallbackSession);

    expect(model?.source).toBe("projection");
    expect(model?.contextAttachments[0]?.id).toBe("context-projection");
    expect(model?.commandOutputs[0]?.preview).toBe("projection");
  });

  it("prefers materialized inspector records when rows exist", () => {
    const model = createMaterializedInspectorSessionReadModel(
      {
        sessionId: "session-a",
        contextAttachments: [
          {
            sessionId: "session-a",
            attachmentId: "context-sqlite",
            kind: "file",
            title: "architecture.md",
            provenance: "desktop",
            contentState: "metadata-only",
            range: { startLine: 10, endLine: 12 }
          }
        ],
        toolCalls: [
          {
            sessionId: "session-a",
            toolCallId: "tool-read",
            name: "read-files",
            status: "succeeded",
            outputSummary: "Read complete"
          }
        ],
        commandOutputs: [
          {
            sessionId: "session-a",
            commandId: "cmd-verify",
            status: "succeeded",
            exitCode: 0,
            chunkCount: 2,
            stdoutPreview: "pnpm verify",
            stderrPreview: "warning"
          }
        ],
        diffSummaries: [
          {
            sessionId: "session-a",
            diffId: "diff-1",
            fileCount: 1,
            additions: 3,
            deletions: 1,
            files: [
              {
                path: "apps/desktop/src/app.tsx",
                changeKind: "modified",
                additions: 3,
                deletions: 1
              }
            ]
          }
        ],
        usageMetadata: [
          {
            sessionId: "session-a",
            usageId: "usage-1",
            source: "provider",
            model: "glm-5.2",
            inputTokens: 100
          }
        ]
      },
      fallbackSession
    );

    expect(model.source).toBe("materialized");
    expect(model.contextAttachments[0]?.id).toBe("context-sqlite");
    expect(model.contextAttachments[0]?.range?.startLine).toBe(10);
    expect(model.toolCalls[0]?.status).toBe("succeeded");
    expect(model.commandOutputs[0]?.preview).toBe("pnpm verify\nwarning");
    expect(model.diffs[0]?.files[0]?.path).toBe("apps/desktop/src/app.tsx");
    expect(model.usageReports[0]?.model).toBe("glm-5.2");
  });

  it("keeps projection records when native materialized rows are unavailable", () => {
    const model = createMaterializedInspectorSessionReadModel(
      {
        sessionId: "session-a",
        contextAttachments: [],
        toolCalls: [],
        commandOutputs: [],
        diffSummaries: [],
        usageMetadata: []
      },
      fallbackSession
    );

    expect(model.source).toBe("projection");
    expect(model.contextAttachments[0]?.id).toBe("context-projection");
    expect(model.commandOutputs[0]?.id).toBe("cmd-projection");
  });
});
