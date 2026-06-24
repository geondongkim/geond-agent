import { describe, expect, it } from "vitest";

import { createApprovalCorrelationKey } from "./index.js";

describe("approval correlation", () => {
  it("prefers structured references over display text", () => {
    expect(
      createApprovalCorrelationKey({
        id: "approval-1",
        kind: "diff",
        diffId: "diff-1",
        subject: "src/app.tsx"
      })
    ).toBe("diff:diff-1");
    expect(
      createApprovalCorrelationKey({
        id: "approval-2",
        kind: "command",
        commandId: "cmd-verify",
        subject: "pnpm verify"
      })
    ).toBe("command:cmd-verify");
  });

  it("falls back to kind-scoped subject and then approval id", () => {
    expect(
      createApprovalCorrelationKey({
        id: "approval-3",
        kind: "filesystem",
        subject: " packages/ui-workbench/src/workbench/events.ts "
      })
    ).toBe("subject:filesystem:packages/ui-workbench/src/workbench/events.ts");
    expect(
      createApprovalCorrelationKey({
        id: "approval-4",
        kind: "network"
      })
    ).toBe("approval:approval-4");
  });
});
