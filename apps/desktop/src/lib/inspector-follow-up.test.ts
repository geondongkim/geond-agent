import { describe, expect, it } from "vitest";

import {
  createApprovalFollowUpDraft,
  createDiffFollowUpDraft,
  createRunAttemptFollowUpDraft,
  createSessionReviewFollowUpDraft,
  createTerminalFollowUpDraft
} from "./inspector-follow-up.js";

describe("inspector follow-up drafts", () => {
  it("creates concise diff follow-up text", () => {
    expect(
      createDiffFollowUpDraft({
        id: "diff-1",
        title: "Workbench polish",
        summary: "Updated inspector",
        files: [
          {
            path: "apps/desktop/src/app.tsx",
            changeKind: "modified",
            additions: 12,
            deletions: 3
          }
        ]
      })
    ).toContain("- apps/desktop/src/app.tsx: modified +12 / -3");
  });

  it("creates approval and terminal follow-up text", () => {
    expect(
      createApprovalFollowUpDraft({
        id: "approval-1",
        kind: "command",
        title: "Run verification",
        status: "pending",
        subject: "pnpm verify"
      })
    ).toContain("Subject: pnpm verify");

    expect(
      createTerminalFollowUpDraft({
        id: "cmd-verify",
        status: "failed",
        exitCode: 1,
        preview: "pnpm verify failed",
        chunkCount: 1
      })
    ).toContain("Preview:\npnpm verify failed");
  });

  it("creates run attempt recovery follow-up text", () => {
    const draft = createRunAttemptFollowUpDraft({
      id: "attempt-1",
      mode: "claude-live",
      status: "failed",
      modelProfileId: "opus",
      providerRouteId: "zai.anthropic-compatible",
      externalSessionId: "claude-session-1",
      commandPreview: "claude --bare -p --verbose --output-format stream-json",
      promptSummary: "Implement the recovery flow",
      exitCode: 1,
      eventCount: 12,
      ignoredRecordCount: 1,
      parseWarningCount: 2,
      errorMessage: "runner failed"
    });

    expect(draft).toContain("Status: failed.");
    expect(draft).toContain("External session: claude-session-1.");
    expect(draft).toContain("Parse warnings: 2.");
    expect(draft).toContain("continue from the safest next step");
  });

  it("creates a session-level review brief from readiness and evidence", () => {
    const draft = createSessionReviewFollowUpDraft({
      activeSession: {
        id: "session-1",
        title: "Controller session",
        lifecycle: "started",
        workspacePath: "/workspace/geond-agent",
        selection: {
          backendAdapterId: "claude-code.external-cli-acp",
          providerRouteId: "zai.anthropic-compatible",
          modelProfileId: "opus",
          routingMode: "manual",
          readiness: {
            level: "blocked",
            summary: "1 readiness blocker must be resolved before live execution.",
            items: [
              {
                id: "provider-route",
                label: "Z.ai route",
                level: "blocked",
                reason: "API key presence is missing."
              }
            ]
          }
        },
        externalSessions: {},
        contextAttachments: [],
        assistantMessages: [],
        plan: [],
        toolCalls: [],
        commandOutputs: [
          {
            id: "cmd-verify",
            status: "failed",
            exitCode: 1,
            preview: "pnpm verify failed",
            chunkCount: 1
          }
        ],
        diffs: [
          {
            id: "diff-1",
            title: "Workbench review",
            summary: "Updated review surface",
            files: []
          }
        ],
        usageReports: [
          {
            id: "usage-1",
            source: "provider",
            model: "glm-5.2",
            inputTokens: 120,
            outputTokens: 40
          }
        ],
        runAttempts: [
          {
            id: "attempt-1",
            mode: "claude-live",
            status: "failed",
            exitCode: 1,
            parseWarningCount: 2
          }
        ],
        runnerIssues: [],
        approvals: [
          {
            id: "approval-1",
            kind: "command",
            title: "Run pnpm verify",
            status: "pending",
            subject: "pnpm verify"
          }
        ],
        notices: [],
        timeline: []
      }
    });

    expect(draft).toContain("Review the current workbench session");
    expect(draft).toContain("Route readiness: blocked");
    expect(draft).toContain("Approval subjects:");
    expect(draft).toContain("Run attempts:");
    expect(draft).toContain("Terminal evidence:");
    expect(draft).toContain("do not expose secrets");
  });
});
