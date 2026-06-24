import { describe, expect, it } from "vitest";

import {
  createExecutionPolicyOptions,
  describeExecutionPolicy
} from "./index.js";

describe("execution policy metadata", () => {
  it("describes adapter-neutral execution policies", () => {
    expect(describeExecutionPolicy("plan")).toMatchObject({
      riskLevel: "read-only",
      allowsWrites: false
    });
    expect(describeExecutionPolicy("ask-first")).toMatchObject({
      riskLevel: "guarded-write",
      allowsWrites: true,
      requiresApproval: true
    });
    expect(describeExecutionPolicy("bypass")).toMatchObject({
      riskLevel: "unsafe",
      requiresApproval: false
    });
  });

  it("creates picker options without backend-specific permission names", () => {
    expect(createExecutionPolicyOptions()).toEqual([
      { value: "plan", label: "Plan only", detail: "read-only" },
      { value: "ask-first", label: "Ask before changes", detail: "guarded-write" },
      { value: "accept-edits", label: "Accept file edits", detail: "write" },
      { value: "bypass", label: "Bypass approvals", detail: "unsafe" }
    ]);
  });
});
