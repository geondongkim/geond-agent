import { describe, expect, it } from "vitest";

import {
  createApprovalFollowUpDraft,
  createDiffFollowUpDraft,
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
});
