import type { UiI18n, WorkbenchSelectionSnapshot } from "@geond-agent/ui-workbench";

import { formatMessage, formatSelectionReadinessDetail } from "../lib/workbench-format.js";

export function formatLiveRunReadinessBlockMessage(
  selection: WorkbenchSelectionSnapshot,
  i18n: UiI18n
): string | undefined {
  if (selection.readiness?.level !== "blocked") {
    return undefined;
  }

  return formatMessage(i18n.t("workbench.runner.readinessBlocked"), {
    detail: formatSelectionReadinessDetail(selection.readiness) ?? selection.readiness.summary
  });
}
