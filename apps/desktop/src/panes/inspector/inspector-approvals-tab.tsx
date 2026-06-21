import type { ApprovalDecision, UiI18n } from "@geond-agent/ui-workbench";

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
  i18n,
  resolveApproval
}: {
  readonly activeSession?: ProjectedActiveSession;
  readonly i18n: UiI18n;
  readonly resolveApproval: (approvalId: string, decision: ApprovalDecision) => void;
}) {
  return (
    <TabsContent value="approvals" className="border-0 bg-transparent p-0">
      {activeSession?.approvals.length ? (
        <div className="space-y-2">
          {activeSession.approvals.map((approval) => (
            <div key={approval.id} className="inspector-card">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">{approval.title}</p>
                  <p className="mt-1 text-xs leading-5 text-[color:var(--ink-soft)]">
                    {approval.subject ?? approval.reason ?? approval.kind}
                  </p>
                </div>
                <span className={cn("status-pill", approvalTone(approval.status, approval.decision))}>
                  {formatStatusLabel(i18n, approval.status)}
                  {approval.decision
                    ? ` / ${formatApprovalDecision(i18n, approval.decision)}`
                    : ""}
                </span>
              </div>
              {approval.status === "pending" ? (
                <div className="mt-3 flex flex-wrap justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => void resolveApproval(approval.id, "rejected")}
                  >
                    {i18n.t("workbench.approvals.reject")}
                  </Button>
                  <Button onClick={() => void resolveApproval(approval.id, "approved")}>
                    {i18n.t("workbench.approvals.approve")}
                  </Button>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      ) : (
        <EmptyState text={i18n.t("workbench.empty.approvals")} />
      )}
    </TabsContent>
  );
}
