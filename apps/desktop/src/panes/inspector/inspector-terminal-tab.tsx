import type { UiI18n } from "@geond-agent/ui-workbench";

import { TabsContent } from "../../components/ui/tabs.js";
import { EmptyState } from "../../components/workbench/empty-state.js";
import { formatStatusLabel } from "../../lib/workbench-format.js";
import type { InspectorSessionReadModel } from "../../lib/inspector-read-model.js";
import type { ProjectedActiveSession } from "../../lib/workbench-types.js";

export function InspectorTerminalTab({
  activeSession,
  commandOutputs,
  i18n
}: {
  readonly activeSession?: ProjectedActiveSession;
  readonly commandOutputs?: InspectorSessionReadModel["commandOutputs"];
  readonly i18n: UiI18n;
}) {
  const outputs = commandOutputs ?? activeSession?.commandOutputs ?? [];

  return (
    <TabsContent value="terminal" className="border-0 bg-transparent p-0">
      {outputs.length ? (
        <div className="space-y-2">
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
            </div>
          ))}
        </div>
      ) : (
        <EmptyState text={i18n.t("workbench.empty.terminal")} />
      )}
    </TabsContent>
  );
}
