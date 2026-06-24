import type { UiI18n, WorkbenchSelectionSnapshot } from "@geond-agent/ui-workbench";

import { formatMessage, formatSelectionReadinessDetail } from "../lib/workbench-format.js";

export const CLAUDE_LIVE_BACKEND_ADAPTER_ID = "claude-code.external-cli-acp";

export function formatLiveRunReadinessBlockMessage(
  selection: WorkbenchSelectionSnapshot,
  i18n: UiI18n
): string | undefined {
  if (selection.backendAdapterId !== CLAUDE_LIVE_BACKEND_ADAPTER_ID) {
    return formatMessage(i18n.t("workbench.runner.readinessBlocked"), {
      detail: [
        `Selected backend ${selection.backendAdapter?.label ?? selection.backendAdapterId} is not executable by the Claude Code live runner.`,
        "Switch the runner mode to Local fixture or select the Claude Code backend before launching."
      ].join(" ")
    });
  }

  if (selection.readiness?.level !== "blocked") {
    return undefined;
  }

  return formatMessage(i18n.t("workbench.runner.readinessBlocked"), {
    detail: formatSelectionReadinessDetail(selection.readiness) ?? selection.readiness.summary
  });
}
