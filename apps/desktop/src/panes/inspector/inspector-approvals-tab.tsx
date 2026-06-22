import type { KeyboardEvent } from "react";

import type {
  ApprovalDecision,
  UiI18n,
  WorkbenchApprovalSnapshot,
  WorkbenchPermissionMode
} from "@geond-agent/ui-workbench";

import { Button } from "../../components/ui/button.js";
import { TabsContent } from "../../components/ui/tabs.js";
import { EmptyState } from "../../components/workbench/empty-state.js";
import { cn } from "../../lib/cn.js";
import {
  approvalTone,
  formatApprovalDecision,
  formatStatusLabel
} from "../../lib/workbench-format.js";
import type { ProjectedActiveSession } from "../../lib/workbench-types.js";

export function InspectorApprovalsTab({
  activeSession,
  canFollowUpApprovals,
  i18n,
  permissionMode,
  resolveApproval,
  setInspectorTab
}: {
  readonly activeSession?: ProjectedActiveSession;
  readonly canFollowUpApprovals: boolean;
  readonly i18n: UiI18n;
  readonly permissionMode: WorkbenchPermissionMode;
  readonly resolveApproval: (approvalId: string, decision: ApprovalDecision) => void;
  readonly setInspectorTab: (tab: string) => void;
}) {
  const emptyText =
    permissionMode === "plan"
      ? i18n.t("workbench.empty.approvals.planMode")
      : activeSession?.lifecycle === "completed"
        ? i18n.t("workbench.empty.approvals.completed")
        : i18n.t("workbench.empty.approvals");

  return (
    <TabsContent value="approvals" className="border-0 bg-transparent p-0">
      {activeSession?.approvals.length ? (
        <div className="space-y-2">
          {activeSession.approvals.map((approval) => {
            const risk = getApprovalRisk(i18n, approval);
            const relatedTab = getRelatedInspectorTab(i18n, approval);
            return (
              <div
                key={approval.id}
                className="inspector-card focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--accent)]"
                role="group"
                tabIndex={approval.status === "pending" ? 0 : undefined}
                aria-label={`Approval ${approval.title}`}
                onKeyDown={(event) => {
                  handleApprovalKeyDown(event, approval, resolveApproval);
                }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold">{approval.title}</p>
                      <span className={cn("status-pill", risk.className)}>{risk.label}</span>
                    </div>
                    <p className="mt-1 text-xs leading-5 text-[color:var(--ink-soft)]">
                      {approval.subject ?? approval.reason ?? approval.kind}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "status-pill",
                      approvalTone(approval.status, approval.decision)
                    )}
                  >
                    {formatStatusLabel(i18n, approval.status)}
                    {approval.decision
                      ? ` / ${formatApprovalDecision(i18n, approval.decision)}`
                      : ""}
                  </span>
                </div>
                {approval.status === "pending" ? (
                  <div className="mt-3 flex flex-wrap justify-end gap-2">
                    {relatedTab ? (
                      <Button
                        variant="ghost"
                        onClick={() => void setInspectorTab(relatedTab.value)}
                      >
                        {relatedTab.label}
                      </Button>
                    ) : null}
                    <Button
                      variant="outline"
                      onClick={() => void resolveApproval(approval.id, "rejected")}
                    >
                      {i18n.t("workbench.approvals.reject")}
                    </Button>
                    <Button onClick={() => void resolveApproval(approval.id, "approved")}>
                      {canFollowUpApprovals
                        ? i18n.t("workbench.approvals.approveAndResume")
                        : i18n.t("workbench.approvals.approve")}
                    </Button>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState text={emptyText} />
      )}
    </TabsContent>
  );
}

function handleApprovalKeyDown(
  event: KeyboardEvent<HTMLDivElement>,
  approval: WorkbenchApprovalSnapshot,
  resolveApproval: (approvalId: string, decision: ApprovalDecision) => void
): void {
  if (approval.status !== "pending") {
    return;
  }

  if (event.key === "Enter") {
    event.preventDefault();
    resolveApproval(approval.id, "approved");
    return;
  }

  if (event.key === "Escape" || event.key === "Backspace") {
    event.preventDefault();
    resolveApproval(approval.id, "rejected");
  }
}

function getApprovalRisk(
  i18n: UiI18n,
  approval: WorkbenchApprovalSnapshot
): { readonly label: string; readonly className: string } {
  switch (approval.kind) {
    case "command":
      return {
        label: i18n.t("workbench.approvals.riskHigh"),
        className: "status-danger"
      };
    case "diff":
    case "filesystem":
    case "network":
      return {
        label: i18n.t("workbench.approvals.riskMedium"),
        className: "status-warn"
      };
    case "mcp":
      return {
        label: i18n.t("workbench.approvals.riskLow"),
        className: "status-neutral"
      };
  }
}

function getRelatedInspectorTab(
  i18n: UiI18n,
  approval: WorkbenchApprovalSnapshot
): { readonly value: "diff" | "terminal"; readonly label: string } | undefined {
  switch (approval.kind) {
    case "diff":
    case "filesystem":
      return { value: "diff", label: i18n.t("workbench.approvals.viewDiff") };
    case "command":
      return { value: "terminal", label: i18n.t("workbench.approvals.viewTerminal") };
    case "network":
    case "mcp":
      return undefined;
  }
}
