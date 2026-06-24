import type { UiI18n } from "@geond-agent/ui-workbench";

import { Button } from "../components/ui/button.js";
import type { DesktopRunnerMode } from "../demo-workbench.js";
import type { ProjectedActiveSession } from "../lib/workbench-types.js";

export function CommandStrip({
  activeRunMode,
  activeSession,
  activeSessionApprovalCount,
  activeSessionPinned,
  canResumeActiveSession,
  cancelActiveRun,
  deleteActiveSession,
  i18n,
  resumeActiveSession,
  runnerBusy,
  runnerMode,
  sessionCount,
  setInspectorTab,
  setRunnerMode,
  startSelectedRunner,
  togglePinnedSession
}: {
  readonly activeRunMode?: DesktopRunnerMode;
  readonly activeSession?: ProjectedActiveSession;
  readonly activeSessionApprovalCount: number;
  readonly activeSessionPinned: boolean;
  readonly canResumeActiveSession: boolean;
  readonly cancelActiveRun: () => void;
  readonly deleteActiveSession: () => void;
  readonly i18n: UiI18n;
  readonly resumeActiveSession: () => void;
  readonly runnerBusy: boolean;
  readonly runnerMode: DesktopRunnerMode;
  readonly sessionCount: number;
  readonly setInspectorTab: (tab: string) => void;
  readonly setRunnerMode: (mode: DesktopRunnerMode) => void;
  readonly startSelectedRunner: () => void;
  readonly togglePinnedSession: () => void;
}) {
  return (
    <header className="command-strip">
      <div className="brand-lockup">
        <div className="app-mark">G</div>
        <div className="min-w-0">
          <p className="eyebrow">{i18n.t("workbench.shell.eyebrow")}</p>
          <h1 className="truncate text-lg font-semibold leading-6">
            {i18n.t("workbench.shell.title")}
          </h1>
          <p className="truncate font-mono text-[11px] text-[color:var(--inverse-soft)]">
            {activeSession?.title ?? i18n.t("workbench.timeline.empty")}
          </p>
        </div>
      </div>

      <div className="command-controls">
        <span className="metric-pill">
          {sessionCount} {i18n.t("workbench.status.total")}
        </span>
        <span className="metric-pill">
          {activeSessionApprovalCount} {i18n.t("workbench.status.approvals")}
        </span>
        <label className="inline-field">
          <span className="text-[10px] font-bold uppercase text-[color:var(--inverse-soft)]">
            {i18n.t("workbench.runner.mode")}
          </span>
          <select
            value={runnerMode}
            onChange={(event) => setRunnerMode(event.target.value as DesktopRunnerMode)}
            className="control-select"
          >
            <option value="fixture">{i18n.t("workbench.runner.fixture")}</option>
            <option value="claude-live">{i18n.t("workbench.runner.claudeLive")}</option>
            <option value="codex-live">{i18n.t("workbench.runner.codexLive")}</option>
          </select>
        </label>
        <Button onClick={startSelectedRunner} disabled={runnerBusy}>
          {runnerBusy
            ? i18n.t("workbench.runner.running")
            : runnerMode === "claude-live"
              ? i18n.t("workbench.actions.runClaudeSession")
              : runnerMode === "codex-live"
                ? i18n.t("workbench.actions.runCodexSession")
              : i18n.t("workbench.actions.newDemoSession")}
        </Button>
        <Button
          variant="outline"
          onClick={resumeActiveSession}
          disabled={!canResumeActiveSession}
        >
          {i18n.t("workbench.actions.resumeSession")}
        </Button>
        {runnerBusy ? (
          <Button
            variant="outline"
            onClick={() => void cancelActiveRun()}
            disabled={activeRunMode !== "claude-live"}
          >
            {i18n.t("workbench.actions.cancelRun")}
          </Button>
        ) : null}
        <Button
          variant="outline"
          onClick={() => void togglePinnedSession()}
          disabled={!activeSession}
        >
          {activeSessionPinned
            ? i18n.t("workbench.actions.unpinSession")
            : i18n.t("workbench.actions.pinSession")}
        </Button>
        <Button
          variant="outline"
          onClick={() => void deleteActiveSession()}
          disabled={!activeSession || runnerBusy}
        >
          {i18n.t("workbench.actions.deleteSession")}
        </Button>
        <Button variant="outline" onClick={() => setInspectorTab("settings")}>
          {i18n.t("workbench.actions.settings")}
        </Button>
      </div>
    </header>
  );
}
