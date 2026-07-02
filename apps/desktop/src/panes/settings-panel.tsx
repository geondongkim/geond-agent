import type { UiI18n } from "@geond-agent/ui-workbench";
import { Settings } from "lucide-react";

import { InspectorSettingsTab } from "./inspector/inspector-settings-tab.js";

type InspectorSettingsTabProps = React.ComponentProps<typeof InspectorSettingsTab>;

export function SettingsPanel({
  onClose,
  i18n,
  workspacePath,
  ...settingsProps
}: InspectorSettingsTabProps & {
  readonly onClose: () => void;
  readonly i18n: UiI18n;
  readonly workspacePath?: string;
}) {
  return (
    <div
      className="settings-overlay"
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="settings-overlay-card">
        <div className="settings-overlay-header">
          <h2 className="panel-title">{i18n.t("workbench.workspacePanel.settings")}</h2>
          <button
            type="button"
            className="settings-overlay-close"
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <div className="settings-overlay-body">
          <InspectorSettingsTab {...settingsProps} i18n={i18n} workspacePath={workspacePath} />
        </div>
      </div>
    </div>
  );
}