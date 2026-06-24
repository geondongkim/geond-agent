export type ExecutionPolicyId = "plan" | "ask-first" | "accept-edits" | "bypass";

export type ExecutionPolicyRiskLevel = "read-only" | "guarded-write" | "write" | "unsafe";

export interface ExecutionPolicyMetadata {
  readonly id: ExecutionPolicyId;
  readonly label: string;
  readonly riskLevel: ExecutionPolicyRiskLevel;
  readonly allowsWrites: boolean;
  readonly requiresApproval: boolean;
  readonly notes?: readonly string[];
}

export const DEFAULT_EXECUTION_POLICIES: readonly ExecutionPolicyMetadata[] = [
  {
    id: "plan",
    label: "Plan only",
    riskLevel: "read-only",
    allowsWrites: false,
    requiresApproval: true,
    notes: ["Use for first-run probes, route checks, and read-only planning."]
  },
  {
    id: "ask-first",
    label: "Ask before changes",
    riskLevel: "guarded-write",
    allowsWrites: true,
    requiresApproval: true,
    notes: ["Use for normal implementation runs that may request approvals."]
  },
  {
    id: "accept-edits",
    label: "Accept file edits",
    riskLevel: "write",
    allowsWrites: true,
    requiresApproval: false,
    notes: ["Use only after the workspace and review path are confirmed."]
  },
  {
    id: "bypass",
    label: "Bypass approvals",
    riskLevel: "unsafe",
    allowsWrites: true,
    requiresApproval: false,
    notes: ["Reserved for isolated evaluation worktrees and never a normal UI default."]
  }
];

export function describeExecutionPolicy(
  id: ExecutionPolicyId,
  policies: readonly ExecutionPolicyMetadata[] = DEFAULT_EXECUTION_POLICIES
): ExecutionPolicyMetadata {
  return (
    policies.find((policy) => policy.id === id) ?? {
      id,
      label: id,
      riskLevel: "unsafe",
      allowsWrites: true,
      requiresApproval: true,
      notes: ["Unknown execution policy id; adapter must map it conservatively."]
    }
  );
}

export function createExecutionPolicyOptions(
  policies: readonly ExecutionPolicyMetadata[] = DEFAULT_EXECUTION_POLICIES
): readonly { readonly value: ExecutionPolicyId; readonly label: string; readonly detail: string }[] {
  return policies.map((policy) => ({
    value: policy.id,
    label: policy.label,
    detail: policy.riskLevel
  }));
}
