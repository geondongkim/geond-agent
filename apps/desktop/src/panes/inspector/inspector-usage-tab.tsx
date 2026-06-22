import type { UiI18n } from "@geond-agent/ui-workbench";

import { TabsContent } from "../../components/ui/tabs.js";
import { EmptyState } from "../../components/workbench/empty-state.js";
import { UsageMetric } from "../../components/workbench/usage-metric.js";
import {
  formatUsageCost,
  formatUsageNumber,
  formatUsageSourceLabel
} from "../../lib/workbench-format.js";
import type { ProjectedActiveSession } from "../../lib/workbench-types.js";

export function InspectorUsageTab({
  activeSession,
  i18n
}: {
  readonly activeSession?: ProjectedActiveSession;
  readonly i18n: UiI18n;
}) {
  return (
    <TabsContent value="usage" className="border-0 bg-transparent p-0">
      {activeSession?.usageReports.length ? (
        <div className="space-y-2">
          {activeSession.usageReports.map((usage) => (
            <div key={usage.id} className="inspector-card">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold">
                    {usage.model ?? i18n.t("workbench.usage.title")}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-[color:var(--ink-soft)]">
                    {i18n.t("workbench.usage.source")}: {formatUsageSourceLabel(i18n, usage.source)}
                  </p>
                </div>
                <span className="status-pill status-neutral">
                  {formatUsageCost(i18n, usage.costUsd)}
                </span>
              </div>
              <div className="usage-grid mt-3">
                <UsageMetric
                  label={i18n.t("workbench.usage.input")}
                  value={formatUsageNumber(i18n, usage.inputTokens)}
                />
                <UsageMetric
                  label={i18n.t("workbench.usage.output")}
                  value={formatUsageNumber(i18n, usage.outputTokens)}
                />
                <UsageMetric
                  label={i18n.t("workbench.usage.cacheRead")}
                  value={formatUsageNumber(i18n, usage.cacheReadInputTokens)}
                />
                <UsageMetric
                  label={i18n.t("workbench.usage.cacheCreate")}
                  value={formatUsageNumber(i18n, usage.cacheCreationInputTokens)}
                />
                <UsageMetric
                  label={i18n.t("workbench.usage.context")}
                  value={formatUsageNumber(i18n, usage.contextWindow)}
                />
                <UsageMetric
                  label={i18n.t("workbench.usage.maxOutput")}
                  value={formatUsageNumber(i18n, usage.maxOutputTokens)}
                />
              </div>
              {usage.serviceTier ? (
                <p className="mt-3 text-xs text-[color:var(--ink-soft)]">
                  {i18n.t("workbench.usage.serviceTier")}: {usage.serviceTier}
                </p>
              ) : null}
            </div>
          ))}
        </div>
      ) : (
        <EmptyState text={i18n.t("workbench.empty.usage")} />
      )}
    </TabsContent>
  );
}
