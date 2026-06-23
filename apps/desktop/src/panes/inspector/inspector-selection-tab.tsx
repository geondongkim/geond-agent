import type {
  UiI18n,
  WorkbenchRuntimeSnapshot
} from "@geond-agent/ui-workbench";

import { TabsContent } from "../../components/ui/tabs.js";
import { EmptyState } from "../../components/workbench/empty-state.js";
import { SettingsRow } from "../../components/workbench/settings-row.js";
import {
  formatAgentLanguageLabel,
  formatExternalSessionId,
  formatMessage,
  formatRoutingModeLabel,
  formatSelectionReadinessDetail,
  formatSelectionReadinessLevelLabel
} from "../../lib/workbench-format.js";
import type { ProjectedActiveSession } from "../../lib/workbench-types.js";

export function InspectorSelectionTab({
  activeExternalSession,
  activeSession,
  bridgeCommand,
  ignoredRecordCount,
  i18n,
  runtimeSnapshot
}: {
  readonly activeExternalSession?: ProjectedActiveSession["externalSessions"][string];
  readonly activeSession?: ProjectedActiveSession;
  readonly bridgeCommand: string;
  readonly ignoredRecordCount: number;
  readonly i18n: UiI18n;
  readonly runtimeSnapshot: WorkbenchRuntimeSnapshot;
}) {
  return (
    <TabsContent value="selection" className="border-0 bg-transparent p-0">
      {activeSession?.selection ? (
        <div className="space-y-2">
          <SettingsRow
            label={i18n.t("workbench.selection.backend")}
            value={activeSession.selection.backendAdapter?.label ?? activeSession.selection.backendAdapterId}
          />
          <SettingsRow
            label={i18n.t("workbench.selection.provider")}
            value={activeSession.selection.providerRoute?.label ?? activeSession.selection.providerRouteId ?? i18n.t("workbench.status.unknown")}
          />
          <SettingsRow
            label={i18n.t("workbench.selection.model")}
            value={activeSession.selection.modelProfile?.label ?? activeSession.selection.modelProfileId ?? i18n.t("workbench.status.unknown")}
          />
          <SettingsRow
            label={i18n.t("workbench.selection.routingMode")}
            value={formatRoutingModeLabel(i18n, activeSession.selection.routingMode)}
          />
          <SettingsRow
            label={i18n.t("workbench.selection.uiLanguage")}
            value={activeSession.selection.uiLanguage ?? runtimeSnapshot.languageSettings.uiLanguage}
          />
          <SettingsRow
            label={i18n.t("workbench.selection.agentLanguage")}
            value={
              formatAgentLanguageLabel(
                i18n,
                activeSession.selection.agentResponseLanguage ??
                  runtimeSnapshot.languageSettings.agentResponseLanguage
              )
            }
          />
          <SettingsRow
            label={i18n.t("workbench.selection.externalSession")}
            value={
              activeExternalSession
                ? formatExternalSessionId(activeExternalSession.externalSessionId)
                : i18n.t("workbench.status.unknown")
            }
          />
          <SettingsRow
            label={i18n.t("workbench.selection.readiness")}
            value={formatSelectionReadinessLevelLabel(
              i18n,
              activeSession.selection.readiness?.level
            )}
            detail={formatSelectionReadinessDetail(activeSession.selection.readiness)}
          />
          <SettingsRow
            label={i18n.t("workbench.selection.warnings")}
            value={
              activeSession.selection.capabilityWarnings?.length
                ? activeSession.selection.capabilityWarnings.join(" | ")
                : `${bridgeCommand || "claude"} --bare -p --verbose --output-format stream-json`
            }
            detail={formatMessage(i18n.t("workbench.selection.ignoredSanitizedRecords"), {
              count: ignoredRecordCount
            })}
          />
        </div>
      ) : (
        <EmptyState text={i18n.t("workbench.empty.selection")} />
      )}
    </TabsContent>
  );
}
