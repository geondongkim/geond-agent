import { useEffect, useMemo, useState } from "react";
import type { UiI18n, WorkbenchSessionDefaults } from "@geond-agent/ui-workbench";
import {
  AlertTriangle,
  Bot,
  FilePlus,
  Paperclip,
  Pin,
  PinOff,
  RotateCcw,
  Send,
  ShieldCheck,
  Settings,
  Square,
  Terminal,
  Trash2
} from "lucide-react";

import { Button } from "../components/ui/button.js";
import { EmptyState } from "../components/workbench/empty-state.js";
import { TimelineEventCard } from "../components/workbench/timeline-event-card.js";
import { cn } from "../lib/cn.js";
import type { ProjectedActiveSession } from "../lib/workbench-types.js";
import {
  formatContextKindLabel,
  formatMessage,
  formatStatusLabel,
  lifecycleTone
} from "../lib/workbench-format.js";
import type { DesktopRunnerMode } from "../demo-workbench.js";
import { getComposerPlaceholder } from "../runs/runner-prompt.js";
import { createTimelineRenderWindow } from "../lib/timeline-window.js";

export function TimelinePane({
  activeSession,
  activeRunMode,
  activeSessionPinned,
  attachFileContext,
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
  readonly attachFileContext: () => void;
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
  const timelineEntries = activeSession?.timeline ?? [];
  const [showFullTimeline, setShowFullTimeline] = useState(false);
  const compactTimelineWindow = useMemo(
    () => createTimelineRenderWindow(timelineEntries),
    [timelineEntries]
  );
  const timelineWindow = showFullTimeline
    ? {
        totalCount: timelineEntries.length,
        visibleCount: timelineEntries.length,
        hiddenMiddleCount: 0,
        headEntries: timelineEntries,
        tailEntries: []
      }
    : compactTimelineWindow;
  const canToggleTimelineWindow = compactTimelineWindow.hiddenMiddleCount > 0;
  const visibleContextAttachments = contextAttachments.slice(-3);
  const hiddenContextAttachmentCount = Math.max(
    contextAttachments.length - visibleContextAttachments.length,
    0
  );
  const recoveryState = getRecoveryState(activeSession, canResumeActiveSession, runnerBusy);

  useEffect(() => {
    setShowFullTimeline(false);
  }, [activeSession?.id]);

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
        {timelineEntries.length ? (
          <>
            {canToggleTimelineWindow && showFullTimeline ? (
              <TimelineWindowDivider
                compactTimelineWindow={compactTimelineWindow}
                i18n={i18n}
                showFullTimeline={showFullTimeline}
                timelineEntries={timelineEntries}
                toggle={() => setShowFullTimeline((current) => !current)}
              />
            ) : null}
            {timelineWindow.headEntries.map((entry) => (
              <TimelineEventCard key={entry.id} entry={entry} i18n={i18n} />
            ))}
            {canToggleTimelineWindow && !showFullTimeline ? (
              <TimelineWindowDivider
                compactTimelineWindow={compactTimelineWindow}
                i18n={i18n}
                showFullTimeline={showFullTimeline}
                timelineEntries={timelineEntries}
                toggle={() => setShowFullTimeline((current) => !current)}
              />
            ) : null}
            {timelineWindow.tailEntries.map((entry) => (
              <TimelineEventCard key={entry.id} entry={entry} i18n={i18n} />
            ))}
          </>
        ) : (
          <EmptyState text={i18n.t("workbench.timeline.empty")} />
        )}
      </div>

      <div className="composer-dock">
        <div className="composer-header">
          <div className="min-w-0">
            <label className="muted-meta" htmlFor="agent-command">
              {i18n.t("workbench.composer.label")}
            </label>
            <p className="composer-route-line">
              {runnerMode === "claude-live"
                ? i18n.t("workbench.runner.claudeLive")
                : i18n.t("workbench.runner.fixture")}{" "}
              / {sessionDefaults.defaultBackendAdapterId} / {sessionDefaults.defaultProviderRouteId}
            </p>
          </div>
          <button
            type="button"
            className="composer-settings-button"
            onClick={() => setInspectorTab("settings")}
          >
            <Settings size={14} />
            {i18n.t("workbench.composer.routeSettings")}
          </button>
        </div>
        <textarea
          id="agent-command"
          aria-label={i18n.t("workbench.composer.label")}
          className="composer-input"
          placeholder={getComposerPlaceholder(runnerMode, i18n)}
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
        <div className="composer-context-row">
          <div className="composer-context-summary">
            <Paperclip size={14} />
            <span>
              {formatMessage(i18n.t("workbench.composer.contextCount"), {
                count: contextAttachments.length
              })}
            </span>
          </div>
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
            <button
              type="button"
              className="context-empty-button"
              onClick={() => setInspectorTab("files")}
            >
              {i18n.t("workbench.context.empty")}
            </button>
          )}
        </div>
        <div className="composer-toolbar">
          <div className="composer-tools">
            <Button
              variant="ghost"
              className="composer-icon-action"
              onClick={() => void attachWorkspaceContext()}
              disabled={!activeSession}
              aria-label={i18n.t("workbench.context.attachWorkspace")}
              title={i18n.t("workbench.context.attachWorkspace")}
            >
              <Paperclip size={15} />
            </Button>
            <Button
              variant="ghost"
              className="composer-icon-action"
              onClick={() => void attachFileContext()}
              disabled={!activeSession}
              aria-label={i18n.t("workbench.context.attachFile")}
              title={i18n.t("workbench.context.attachFile")}
            >
              <FilePlus size={15} />
            </Button>
            <button
              type="button"
              className="composer-tool-pill"
              onClick={() => setInspectorTab("settings")}
            >
              <Bot size={14} />
              <span className="muted-meta">{i18n.t("workbench.composer.model")}</span>
              {sessionDefaults.defaultModelAlias}
            </button>
            <button
              type="button"
              className="composer-tool-pill"
              onClick={() => setInspectorTab("settings")}
            >
              <ShieldCheck size={14} />
              <span className="muted-meta">{i18n.t("workbench.composer.permission")}</span>
              {sessionDefaults.defaultPermissionMode}
            </button>
          </div>
          <div className="composer-actions">
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

function TimelineWindowDivider({
  compactTimelineWindow,
  i18n,
  showFullTimeline,
  timelineEntries,
  toggle
}: {
  readonly compactTimelineWindow: ReturnType<typeof createTimelineRenderWindow>;
  readonly i18n: UiI18n;
  readonly showFullTimeline: boolean;
  readonly timelineEntries: readonly ProjectedActiveSession["timeline"][number][];
  readonly toggle: () => void;
}) {
  return (
    <div className="timeline-window-divider" role="status" aria-live="polite">
      <span>
        {showFullTimeline
          ? formatMessage(i18n.t("workbench.timeline.showingFull"), {
              total: timelineEntries.length
            })
          : formatMessage(i18n.t("workbench.timeline.windowed"), {
              hidden: compactTimelineWindow.hiddenMiddleCount,
              total: compactTimelineWindow.totalCount,
              visible: compactTimelineWindow.visibleCount
            })}
      </span>
      <button
        type="button"
        aria-expanded={showFullTimeline}
        className="timeline-window-toggle"
        onClick={toggle}
      >
        {showFullTimeline
          ? i18n.t("workbench.timeline.showCompact")
          : i18n.t("workbench.timeline.showFull")}
      </button>
    </div>
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
  const hasRecoverableRunAttempt = activeSession.runAttempts.some(
    (attempt) => attempt.status === "failed" || attempt.status === "cancelled"
  );
  const needsRecovery =
    activeSession.lifecycle === "failed" ||
    activeSession.lifecycle === "paused" ||
    hasInterruptedOrFailedCommand ||
    hasRecoverableRunAttempt;

  return needsRecovery ? { canResume } : undefined;
}
