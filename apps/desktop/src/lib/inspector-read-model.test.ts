import { describe, expect, it } from "vitest";
import { projectWorkbenchEvents, type WorkbenchEvent } from "@geond-agent/ui-workbench";
import {
  createInspectorEvidenceSignature,
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
  usageReports: [],
  runAttempts: [
    {
      id: "attempt-projection",
      mode: "fixture",
      status: "running",
      eventCount: 1
    }
  ],
  runnerIssues: []
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
            inputTokens: 100,
            costUsd: null
          } as unknown as NonNullable<
            Parameters<typeof createMaterializedInspectorSessionReadModel>[0]["usageMetadata"]
          >[number]
        ],
        runAttempts: [
          {
            sessionId: "session-a",
            attemptId: "attempt-sqlite",
            mode: "claude-live",
            status: "succeeded",
            backendAdapterId: "claude-code.external-cli-acp",
            providerRouteId: "zai.anthropic-compatible",
            modelProfileId: "opus",
            routingMode: "manual",
            permissionMode: "plan",
            externalSessionId: "claude-session-1",
            resumedFromExternalSessionId: undefined,
            commandPreview: "claude --bare -p --verbose --output-format stream-json",
            promptSummary: "Implement persistence polish",
            startedAt: "2026-06-22T04:00:00.000Z",
            finishedAt: "2026-06-22T04:01:00.000Z",
            exitCode: 0,
            eventCount: 12,
            ignoredRecordCount: 1,
            parseWarningCount: 0,
            errorMessage: undefined,
            failureKind: "provider_overloaded",
            trigger: "approval_follow_up",
            sourceApprovalId: "approval-1"
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
    expect(model.usageReports[0]?.costUsd).toBeUndefined();
    expect(model.runAttempts[0]).toMatchObject({
      id: "attempt-sqlite",
      status: "succeeded",
      modelProfileId: "opus",
      eventCount: 12,
      failureKind: "provider_overloaded",
      trigger: "approval_follow_up",
      sourceApprovalId: "approval-1"
    });
  });

  it("keeps projection records when native materialized rows are unavailable", () => {
    const model = createMaterializedInspectorSessionReadModel(
      {
        sessionId: "session-a",
        contextAttachments: [],
        toolCalls: [],
        commandOutputs: [],
        diffSummaries: [],
        usageMetadata: [],
        runAttempts: []
      },
      fallbackSession
    );

    expect(model.source).toBe("projection");
    expect(model.contextAttachments[0]?.id).toBe("context-projection");
    expect(model.commandOutputs[0]?.id).toBe("cmd-projection");
    expect(model.runAttempts[0]?.id).toBe("attempt-projection");
  });

  it("keeps the inspector evidence signature stable for timeline-only changes", () => {
    const first = createInspectorEvidenceSignature({
      ...fallbackSession,
      timeline: [
        {
          id: "assistant-1",
          kind: "assistant",
          title: "Assistant update",
          body: "first"
        }
      ]
    } as unknown as ProjectedActiveSession);
    const second = createInspectorEvidenceSignature({
      ...fallbackSession,
      timeline: [
        {
          id: "assistant-1",
          kind: "assistant",
          title: "Assistant update",
          body: "first plus more streamed text"
        }
      ]
    } as unknown as ProjectedActiveSession);

    expect(second).toBe(first);
  });

  it("changes the inspector evidence signature when materialized evidence changes", () => {
    const first = createInspectorEvidenceSignature(fallbackSession);
    const second = createInspectorEvidenceSignature({
      ...fallbackSession,
      commandOutputs: [
        {
          id: "cmd-projection",
          status: "succeeded",
          preview: "projection\nmore output",
          chunkCount: 2
        }
      ]
    } as unknown as ProjectedActiveSession);

    expect(second).not.toBe(first);
  });

  it("changes the inspector evidence signature when runner issues change", () => {
    const first = createInspectorEvidenceSignature(fallbackSession);
    const second = createInspectorEvidenceSignature({
      ...fallbackSession,
      runnerIssues: [
        {
          id: "issue-attempt-1-provider_overloaded",
          kind: "provider_overloaded",
          severity: "error",
          title: "Provider route overloaded",
          message: "Z.ai route returned HTTP 529.",
          retryable: true,
          suggestedAction: "retry_later",
          providerRouteId: "zai.anthropic-compatible",
          modelProfileId: "opus",
          routeHealth: "degraded",
          detectedAt: "2026-06-23T00:00:00.000Z"
        }
      ]
    } as unknown as ProjectedActiveSession);

    expect(second).not.toBe(first);
  });

  it("changes the inspector evidence signature when same-length evidence text changes", () => {
    const first = createInspectorEvidenceSignature({
      ...fallbackSession,
      toolCalls: [
        {
          id: "tool-read",
          name: "read",
          status: "succeeded",
          outputSummary: "read alpha"
        }
      ]
    } as unknown as ProjectedActiveSession);
    const second = createInspectorEvidenceSignature({
      ...fallbackSession,
      toolCalls: [
        {
          id: "tool-read",
          name: "read",
          status: "succeeded",
          outputSummary: "read bravo"
        }
      ]
    } as unknown as ProjectedActiveSession);

    expect("read alpha").toHaveLength("read bravo".length);
    expect(second).not.toBe(first);
  });

  it("keeps materialized refresh signatures stable across projected assistant stream updates", () => {
    const baseEvents: readonly WorkbenchEvent[] = [
      {
        type: "session.lifecycle",
        sessionId: "session-stream",
        lifecycle: "started",
        title: "Streaming session",
        at: "2026-06-23T00:00:00.000Z"
      },
      {
        type: "context.attached",
        sessionId: "session-stream",
        attachment: {
          id: "context-workspace",
          kind: "workspace",
          title: "geond-agent",
          provenance: "desktop",
          contentState: "metadata-only",
          attachedAt: "2026-06-23T00:00:01.000Z"
        },
        at: "2026-06-23T00:00:01.000Z"
      },
      {
        type: "command.output",
        sessionId: "session-stream",
        commandId: "cmd-verify",
        stream: "stdout",
        text: "pnpm verify",
        status: "running",
        at: "2026-06-23T00:00:02.000Z"
      }
    ];
    const first = createInspectorEvidenceSignature(
      projectWorkbenchEvents(baseEvents).activeSession
    );
    const assistantOnly = createInspectorEvidenceSignature(
      projectWorkbenchEvents([
        ...baseEvents,
        {
          type: "assistant.text.delta",
          sessionId: "session-stream",
          messageId: "assistant-1",
          text: "Thinking through the implementation...",
          at: "2026-06-23T00:00:03.000Z"
        },
        {
          type: "assistant.text.delta",
          sessionId: "session-stream",
          messageId: "assistant-1",
          text: "More streamed assistant text.",
          at: "2026-06-23T00:00:04.000Z"
        }
      ]).activeSession
    );
    const commandEvidenceChanged = createInspectorEvidenceSignature(
      projectWorkbenchEvents([
        ...baseEvents,
        {
          type: "assistant.text.delta",
          sessionId: "session-stream",
          messageId: "assistant-1",
          text: "Thinking through the implementation...",
          at: "2026-06-23T00:00:03.000Z"
        },
        {
          type: "command.output",
          sessionId: "session-stream",
          commandId: "cmd-verify",
          stream: "stdout",
          text: "all checks passed",
          status: "succeeded",
          exitCode: 0,
          at: "2026-06-23T00:00:05.000Z"
        }
      ]).activeSession
    );

    expect(assistantOnly).toBe(first);
    expect(commandEvidenceChanged).not.toBe(first);
  });
});
