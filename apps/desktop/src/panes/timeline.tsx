import type { UiI18n, WorkbenchSessionDefaults } from "@geond-agent/ui-workbench";
import {
  AlertTriangle,
  Paperclip,
  Pin,
  PinOff,
  RotateCcw,
  Send,
  Settings,
  Square,
  Terminal,
  Trash2
} from "lucide-react";

import { Button } from "../components/ui/button.js";
import { EmptyState } from "../components/workbench/empty-state.js";
import { cn } from "../lib/cn.js";
import type { ProjectedActiveSession } from "../lib/workbench-types.js";
import {
  eventBodyTone,
  eventCardTone,
  eventDotTone,
  formatContextKindLabel,
  formatEventTime,
  formatMessage,
  formatStatusLabel,
  formatTimelineKindLabel,
  lifecycleTone
} from "../lib/workbench-format.js";
import type { DesktopRunnerMode } from "../demo-workbench.js";
import { createRunnerPrompt } from "../runs/runner-prompt.js";

export function TimelinePane({
  activeSession,
  activeRunMode,
  activeSessionPinned,
  attachWorkspaceContext,
  canResumeActiveSession,
  cancelActiveRun,
  composerPrompt,
  deleteActiveSession,
  i18n,
  pendingApprovals,
  resumeActiveSession,
  runnerBusy,
  runnerMode,
  runnerStatus,
  sessionDefaults,
  setComposerPrompt,
  setInspectorTab,
  startSelectedRunner,
  togglePinnedSession
}: {
  readonly activeSession?: ProjectedActiveSession;
  readonly activeRunMode?: DesktopRunnerMode;
  readonly activeSessionPinned: boolean;
  readonly attachWorkspaceContext: () => void;
  readonly canResumeActiveSession: boolean;
  readonly cancelActiveRun: () => void;
  readonly composerPrompt: string;
  readonly deleteActiveSession: () => void;
  readonly i18n: UiI18n;
  readonly pendingApprovals: readonly ProjectedActiveSession["approvals"][number][];
  readonly resumeActiveSession: () => void;
  readonly runnerBusy: boolean;
  readonly runnerMode: DesktopRunnerMode;
  readonly runnerStatus: string;
  readonly sessionDefaults: WorkbenchSessionDefaults;
  readonly setComposerPrompt: (prompt: string) => void;
  readonly setInspectorTab: (tab: string) => void;
  readonly startSelectedRunner: () => void;
  readonly togglePinnedSession: () => void;
}) {
  const contextAttachments = activeSession?.contextAttachments ?? [];
  const visibleContextAttachments = contextAttachments.slice(-3);
  const hiddenContextAttachmentCount = Math.max(
    contextAttachments.length - visibleContextAttachments.length,
    0
  );
  const recoveryState = getRecoveryState(activeSession, canResumeActiveSession, runnerBusy);

  return (
    <section className="timeline-surface">
      <div className="transcript-heading">
        <div className="min-w-0">
          <h2 className="panel-title">{i18n.t("workbench.timeline.title")}</h2>
          <p className="mt-1 truncate text-xl font-semibold">
            {activeSession?.title ?? i18n.t("workbench.timeline.empty")}
          </p>
        </div>
        {activeSession ? (
          <span className={cn("status-pill", lifecycleTone[activeSession.lifecycle])}>
            {formatStatusLabel(i18n, activeSession.lifecycle)}
          </span>
        ) : null}
      </div>

      {runnerStatus ? <div className="run-status-strip">{runnerStatus}</div> : null}

      {pendingApprovals.length ? (
        <div className="approval-banner">
          <div className="min-w-0">
            <p className="text-sm font-semibold">
              {i18n.t("workbench.approvals.requiredTitle")}
            </p>
            <p className="mt-1 text-xs leading-5 text-[color:var(--ink-soft)]">
              {formatMessage(i18n.t("workbench.approvals.requiredDetail"), {
                count: pendingApprovals.length
              })}
            </p>
          </div>
          <Button variant="outline" onClick={() => setInspectorTab("review")}>
            {i18n.t("workbench.approvals.review")}
          </Button>
        </div>
      ) : null}

      {recoveryState ? (
        <div className="recovery-banner">
          <div className="flex min-w-0 items-start gap-3">
            <AlertTriangle className="mt-0.5 shrink-0 text-[color:var(--danger)]" size={18} />
            <div className="min-w-0">
              <p className="text-sm font-semibold">{i18n.t("workbench.recovery.title")}</p>
              <p className="mt-1 text-xs leading-5 text-[color:var(--ink-soft)]">
                {recoveryState.canResume
                  ? i18n.t("workbench.recovery.resumeDetail")
                  : i18n.t("workbench.recovery.checkDetail")}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="outline" className="gap-2" onClick={() => setInspectorTab("terminal")}>
              <Terminal size={14} />
              {i18n.t("workbench.recovery.openTerminal")}
            </Button>
            <Button variant="outline" className="gap-2" onClick={() => setInspectorTab("settings")}>
              <Settings size={14} />
              {i18n.t("workbench.recovery.openSettings")}
            </Button>
            {recoveryState.canResume ? (
              <Button className="gap-2" onClick={resumeActiveSession}>
                <RotateCcw size={14} />
                {i18n.t("workbench.actions.resumeSession")}
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}

      {activeSession?.plan.length ? (
        <div className="plan-strip">
          {activeSession.plan.map((item) => (
            <div key={item.id} className="plan-step">
              <p className="muted-meta">{formatStatusLabel(i18n, item.status)}</p>
              <p className="mt-1 text-sm font-medium leading-5">{item.title}</p>
            </div>
          ))}
        </div>
      ) : null}

      <div className="event-stream pt-3">
        {activeSession?.timeline.length ? (
          activeSession.timeline.map((entry) => (
            <article
              key={entry.id}
              className={cn("event-card", eventCardTone(entry.kind))}
            >
              <div className="event-rail">
                <span className={cn("event-dot", eventDotTone(entry.kind, entry.status))} />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="muted-meta">{formatTimelineKindLabel(i18n, entry.kind)}</p>
                    <h3 className="truncate text-sm font-semibold">{entry.title}</h3>
                  </div>
                  <div className="text-right">
                    {entry.status ? (
                      <p className="muted-meta">{formatStatusLabel(i18n, entry.status)}</p>
                    ) : null}
                    {entry.at ? (
                      <p className="font-mono text-[11px] text-[color:var(--ink-muted)]">
                        {formatEventTime(entry.at)}
                      </p>
                    ) : null}
                  </div>
                </div>
                {entry.body ? (
                  <p className={cn("mt-2 whitespace-pre-wrap text-sm leading-6", eventBodyTone(entry.kind))}>
                    {entry.body}
                  </p>
                ) : null}
              </div>
            </article>
          ))
        ) : (
          <EmptyState text={i18n.t("workbench.timeline.empty")} />
        )}
      </div>

      <div className="composer-dock">
        <div className="mb-2 flex items-center justify-between gap-3">
          <label className="muted-meta" htmlFor="agent-command">
            {i18n.t("workbench.composer.label")}
          </label>
          <button
            type="button"
            className="route-summary-chip"
            onClick={() => setInspectorTab("settings")}
          >
            {runnerMode === "claude-live"
              ? i18n.t("workbench.runner.claudeLive")
              : i18n.t("workbench.runner.fixture")}{" "}
            / {sessionDefaults.defaultModelAlias}
          </button>
        </div>
        <div className="context-strip">
          <div className="min-w-0">
            <p className="muted-meta">{i18n.t("workbench.context.composerTitle")}</p>
            {visibleContextAttachments.length ? (
              <div className="context-chip-row">
                {visibleContextAttachments.map((attachment) => (
                  <button
                    key={attachment.id}
                    type="button"
                    className="context-chip"
                    onClick={() => setInspectorTab("files")}
                    title={attachment.path ?? attachment.title}
                  >
                    <span>{formatContextKindLabel(i18n, attachment.kind)}</span>
                    {attachment.title}
                  </button>
                ))}
                {hiddenContextAttachmentCount > 0 ? (
                  <button
                    type="button"
                    className="context-chip context-chip-more"
                    onClick={() => setInspectorTab("files")}
                  >
                    {formatMessage(i18n.t("workbench.context.more"), {
                      count: hiddenContextAttachmentCount
                    })}
                  </button>
                ) : null}
              </div>
            ) : (
              <p className="mt-1 text-xs text-[color:var(--ink-muted)]">
                {i18n.t("workbench.context.empty")}
              </p>
            )}
          </div>
          <Button
            variant="ghost"
            className="gap-2"
            onClick={() => void attachWorkspaceContext()}
            disabled={!activeSession}
          >
            <Paperclip size={14} />
            {i18n.t("workbench.context.attachWorkspace")}
          </Button>
        </div>
        <textarea
          id="agent-command"
          aria-label={i18n.t("workbench.composer.label")}
          className="composer-input"
          placeholder={createRunnerPrompt(runnerMode, "", i18n)}
          value={composerPrompt}
          onChange={(event) => setComposerPrompt(event.target.value)}
          onKeyDown={(event) => {
            const shouldDispatch =
              event.key === "Enter" &&
              !event.shiftKey &&
              !event.nativeEvent.isComposing &&
              (sessionDefaults.composerEnterBehavior === "enter" ||
                event.metaKey ||
                event.ctrlKey);

            if (shouldDispatch) {
              event.preventDefault();
              startSelectedRunner();
            }
          }}
        />
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <div className="composer-options">
            <span className="composer-chip">{sessionDefaults.defaultBackendAdapterId}</span>
            <span className="composer-chip">{sessionDefaults.defaultProviderRouteId}</span>
            <span className="composer-chip">{sessionDefaults.defaultPermissionMode}</span>
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              variant="ghost"
              aria-label={
                activeSessionPinned
                  ? i18n.t("workbench.actions.unpinSession")
                  : i18n.t("workbench.actions.pinSession")
              }
              title={
                activeSessionPinned
                  ? i18n.t("workbench.actions.unpinSession")
                  : i18n.t("workbench.actions.pinSession")
              }
              onClick={() => void togglePinnedSession()}
              disabled={!activeSession}
            >
              {activeSessionPinned ? <PinOff size={15} /> : <Pin size={15} />}
            </Button>
            <Button
              variant="ghost"
              aria-label={i18n.t("workbench.actions.deleteSession")}
              title={i18n.t("workbench.actions.deleteSession")}
              onClick={() => void deleteActiveSession()}
              disabled={!activeSession || runnerBusy}
            >
              <Trash2 size={15} />
            </Button>
            {runnerBusy ? (
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => void cancelActiveRun()}
                disabled={activeRunMode !== "claude-live"}
              >
                <Square size={14} />
                {i18n.t("workbench.actions.cancelRun")}
              </Button>
            ) : null}
            <Button
              variant="outline"
              className="gap-2"
              onClick={resumeActiveSession}
              disabled={!canResumeActiveSession}
            >
              <RotateCcw size={14} />
              {i18n.t("workbench.actions.resumeSession")}
            </Button>
            <Button className="gap-2" onClick={startSelectedRunner} disabled={runnerBusy}>
              <Send size={14} />
              {runnerBusy
                ? i18n.t("workbench.runner.running")
                : i18n.t("workbench.composer.dispatch")}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

function getRecoveryState(
  activeSession: ProjectedActiveSession | undefined,
  canResume: boolean,
  runnerBusy: boolean
): { readonly canResume: boolean } | undefined {
  if (!activeSession || runnerBusy) {
    return undefined;
  }

  const hasInterruptedOrFailedCommand = activeSession.commandOutputs.some(
    (command) => command.status === "failed" || command.status === "interrupted"
  );
  const needsRecovery =
    activeSession.lifecycle === "failed" ||
    activeSession.lifecycle === "paused" ||
    hasInterruptedOrFailedCommand;

  return needsRecovery ? { canResume } : undefined;
}
