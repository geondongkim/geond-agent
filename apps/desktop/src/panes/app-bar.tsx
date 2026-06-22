import type { UiI18n, WorkbenchSessionDefaults } from "@geond-agent/ui-workbench";
import {
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen
} from "lucide-react";

import { Button } from "../components/ui/button.js";
import { cn } from "../lib/cn.js";
import type { ProjectedActiveSession } from "../lib/workbench-types.js";
import { formatStatusLabel, lifecycleTone } from "../lib/workbench-format.js";
import type { DesktopRunnerMode } from "../demo-workbench.js";

export function AppBar({
  activeSession,
  i18n,
  leftPanelOpen,
  rightPanelOpen,
  runnerBusy,
  runnerMode,
  sessionDefaults,
  sessionCount,
  setInspectorTab,
  setLeftPanelOpen,
  setRightPanelOpen
}: {
  readonly activeSession?: ProjectedActiveSession;
  readonly i18n: UiI18n;
  readonly leftPanelOpen: boolean;
  readonly rightPanelOpen: boolean;
  readonly runnerBusy: boolean;
  readonly runnerMode: DesktopRunnerMode;
  readonly sessionDefaults: WorkbenchSessionDefaults;
  readonly sessionCount: number;
  readonly setInspectorTab: (tab: string) => void;
  readonly setLeftPanelOpen: (open: boolean) => void;
  readonly setRightPanelOpen: (open: boolean) => void;
}) {
  return (
    <header className="app-bar">
      <div className="app-bar-left">
        <Button
          variant="ghost"
          className="chrome-button"
          aria-label={
            leftPanelOpen
              ? i18n.t("workbench.actions.hideSessions")
              : i18n.t("workbench.actions.showSessions")
          }
          title={
            leftPanelOpen
              ? i18n.t("workbench.actions.hideSessions")
              : i18n.t("workbench.actions.showSessions")
          }
          onClick={() => setLeftPanelOpen(!leftPanelOpen)}
        >
          {leftPanelOpen ? <PanelLeftClose size={16} /> : <PanelLeftOpen size={16} />}
        </Button>
        <div className="brand-lockup">
          <div className="app-mark">G</div>
          <div className="min-w-0">
            <p className="eyebrow">{i18n.t("workbench.shell.eyebrow")}</p>
            <h1 className="truncate text-base font-semibold leading-6">
              {i18n.t("workbench.shell.title")}
            </h1>
          </div>
        </div>
      </div>

      <div className="app-bar-center">
        <p className="truncate text-sm font-semibold">
          {activeSession?.title ?? i18n.t("workbench.timeline.empty")}
        </p>
        <div className="app-bar-meta">
          <span className="metric-pill">
            {sessionCount} {i18n.t("workbench.status.total")}
          </span>
          {activeSession ? (
            <span className={cn("status-pill", lifecycleTone[activeSession.lifecycle])}>
              {formatStatusLabel(i18n, activeSession.lifecycle)}
            </span>
          ) : null}
          <span className="metric-pill">
            {runnerMode === "claude-live"
              ? i18n.t("workbench.runner.claudeLive")
              : i18n.t("workbench.runner.fixture")}
          </span>
        </div>
      </div>

      <div className="app-bar-right">
        <span className="model-chip">
          {sessionDefaults.defaultBackendAdapterId} / {sessionDefaults.defaultModelAlias}
        </span>
        {runnerBusy ? (
          <span className="status-pill status-warn">{i18n.t("workbench.runner.running")}</span>
        ) : null}
        <Button
          variant="ghost"
          className="chrome-button"
          onClick={() => {
            setInspectorTab("review");
            setRightPanelOpen(!rightPanelOpen);
          }}
          aria-label={
            rightPanelOpen
              ? i18n.t("workbench.actions.hideWorkspacePanel")
              : i18n.t("workbench.actions.showWorkspacePanel")
          }
          title={
            rightPanelOpen
              ? i18n.t("workbench.actions.hideWorkspacePanel")
              : i18n.t("workbench.actions.showWorkspacePanel")
          }
        >
          {rightPanelOpen ? <PanelRightClose size={16} /> : <PanelRightOpen size={16} />}
        </Button>
      </div>
    </header>
  );
}
