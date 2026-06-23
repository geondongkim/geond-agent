import type { UiI18n } from "@geond-agent/ui-workbench";
import { AlertTriangle, MessageSquarePlus } from "lucide-react";

import { Button } from "../../components/ui/button.js";
import { TabsContent } from "../../components/ui/tabs.js";
import { EmptyState } from "../../components/workbench/empty-state.js";
import { createTerminalFollowUpDraft } from "../../lib/inspector-follow-up.js";
import {
  formatRouteHealthLabel,
  formatStatusLabel
} from "../../lib/workbench-format.js";
import type { InspectorSessionReadModel } from "../../lib/inspector-read-model.js";
import type { ProjectedActiveSession } from "../../lib/workbench-types.js";

export function InspectorTerminalTab({
  activeSession,
  commandOutputs,
  enqueueSideChatDraft,
  i18n
}: {
  readonly activeSession?: ProjectedActiveSession;
  readonly commandOutputs?: InspectorSessionReadModel["commandOutputs"];
  readonly enqueueSideChatDraft: (text: string, sourceLabel?: string) => void;
  readonly i18n: UiI18n;
}) {
  const outputs = commandOutputs ?? activeSession?.commandOutputs ?? [];
  const latestIssue = activeSession?.runnerIssues[0];

  return (
    <TabsContent value="terminal" className="border-0 bg-transparent p-0">
      {outputs.length || latestIssue ? (
        <div className="space-y-2">
          {latestIssue ? (
            <div className="terminal-card border-[color:color-mix(in_srgb,var(--danger)_38%,var(--line-soft))]">
              <div className="flex items-start gap-3">
                <AlertTriangle
                  aria-hidden="true"
                  size={16}
                  className="mt-0.5 shrink-0 text-[color:var(--danger)]"
                />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[color:var(--danger)]">
                    {latestIssue.title}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-[color:var(--shell-soft)]">
                    {latestIssue.message}
                  </p>
                  <p className="mt-2 font-mono text-[11px] text-[color:var(--inverse-soft)]">
                    {formatStatusLabel(i18n, latestIssue.kind)}
                    {" / "}
                    {formatRouteHealthLabel(i18n, latestIssue.routeHealth)}
                  </p>
                </div>
              </div>
            </div>
          ) : null}
          {outputs.map((output) => (
            <div key={output.id} className="terminal-card">
              <div className="flex items-center justify-between gap-2">
                <p className="font-mono text-xs uppercase text-[color:var(--shell-soft)]">
                  {output.id}
                </p>
                <p className="font-mono text-[11px] text-[color:var(--inverse-soft)]">
                  {formatStatusLabel(i18n, output.status)}
                  {output.exitCode !== undefined ? ` / ${output.exitCode}` : ""}
                </p>
              </div>
              <pre className="mt-3 whitespace-pre-wrap font-mono text-xs leading-6 text-[color:var(--inverse-soft)]">
                {output.preview}
              </pre>
              <div className="mt-3 flex justify-end">
                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={() =>
                    enqueueSideChatDraft(createTerminalFollowUpDraft(output), output.id)
                  }
                >
                  <MessageSquarePlus size={14} />
                  {i18n.t("workbench.followUp.queueTerminal")}
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState text={i18n.t("workbench.empty.terminal")} />
      )}
    </TabsContent>
  );
}
