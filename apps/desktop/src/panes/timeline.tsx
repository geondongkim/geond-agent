import type { UiI18n, WorkbenchSessionDefaults } from "@geond-agent/ui-workbench";

import { Button } from "../components/ui/button.js";
import { EmptyState } from "../components/workbench/empty-state.js";
import { cn } from "../lib/cn.js";
import type { ProjectedActiveSession } from "../lib/workbench-types.js";
import {
  eventBodyTone,
  eventCardTone,
  eventDotTone,
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
  canResumeActiveSession,
  composerPrompt,
  i18n,
  pendingApprovals,
  resumeActiveSession,
  runnerBusy,
  runnerMode,
  runnerStatus,
  sessionDefaults,
  setComposerPrompt,
  setInspectorTab,
  startSelectedRunner
}: {
  readonly activeSession?: ProjectedActiveSession;
  readonly canResumeActiveSession: boolean;
  readonly composerPrompt: string;
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
}) {
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
          <Button variant="outline" onClick={() => setInspectorTab("approvals")}>
            {i18n.t("workbench.approvals.review")}
          </Button>
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
          <span className="font-mono text-[11px] text-[color:var(--ink-muted)]">
            {sessionDefaults.defaultBackendAdapterId} / {sessionDefaults.defaultModelAlias}
          </span>
        </div>
        <textarea
          id="agent-command"
          aria-label={i18n.t("workbench.composer.label")}
          className="composer-input"
          placeholder={createRunnerPrompt(runnerMode, "", i18n)}
          value={composerPrompt}
          onChange={(event) => setComposerPrompt(event.target.value)}
          onKeyDown={(event) => {
            if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
              startSelectedRunner();
            }
          }}
        />
        <div className="mt-2 flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={resumeActiveSession}
            disabled={!canResumeActiveSession}
          >
            {i18n.t("workbench.actions.resumeSession")}
          </Button>
          <Button onClick={startSelectedRunner} disabled={runnerBusy}>
            {runnerBusy
              ? i18n.t("workbench.runner.running")
              : i18n.t("workbench.composer.dispatch")}
          </Button>
        </div>
      </div>
    </section>
  );
}
