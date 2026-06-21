import type { UiI18n } from "@geond-agent/ui-workbench";

import { TabsContent } from "../../components/ui/tabs.js";
import { EmptyState } from "../../components/workbench/empty-state.js";
import type { ProjectedActiveSession } from "../../lib/workbench-types.js";

export function InspectorDiffTab({
  activeSession,
  i18n
}: {
  readonly activeSession?: ProjectedActiveSession;
  readonly i18n: UiI18n;
}) {
  return (
    <TabsContent value="diff" className="border-0 bg-transparent p-0">
      {activeSession?.diffs.length ? (
        <div className="space-y-2">
          {activeSession.diffs.map((diff) => (
            <div key={diff.id} className="inspector-card">
              <p className="text-sm font-semibold">{diff.title ?? diff.id}</p>
              <p className="mt-1 text-xs leading-5 text-[color:var(--ink-soft)]">
                {diff.summary}
              </p>
              <div className="mt-3 space-y-2">
                {diff.files.map((file) => (
                  <div key={`${diff.id}:${file.path}`} className="rounded-md bg-[color:var(--panel-muted)] px-3 py-2 text-xs">
                    <p className="font-mono font-medium">{file.path}</p>
                    <p className="mt-1 text-[color:var(--ink-soft)]">
                      {file.changeKind} +{file.additions ?? 0} / -{file.deletions ?? 0}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState text={i18n.t("workbench.empty.diff")} />
      )}
    </TabsContent>
  );
}
