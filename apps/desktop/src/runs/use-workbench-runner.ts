import { useRef, useState } from "react";
import {
  workbenchEventIdentity,
  type UiI18n,
  type WorkbenchEvent,
  type WorkbenchPermissionMode,
  type WorkbenchRunAttemptTrigger,
  type WorkbenchRuntimeSnapshot,
  type WorkbenchSessionControllerSnapshot,
  type WorkbenchSessionDefaults,
  type WorkbenchSelectionCatalog
} from "@geond-agent/ui-workbench";

import { cancelTauriClaudeCodeStream } from "../claude-runner.js";
import type { DesktopDemoDocument, DesktopRunnerMode } from "../demo-workbench.js";
import { createSelectionSnapshotFromRequest } from "../lib/selection-snapshot.js";
import type { ProjectedSessionListItem } from "../lib/workbench-types.js";
import { formatMessage } from "../lib/workbench-format.js";
import {
  createLiveRunCancelledEvents,
  createLiveRunCompletionEvents,
  createLiveRunFailureEvents,
  createLiveRunPreludeEvents,
  createLiveRunReadinessBlockedEvents,
  createRunnerIssueDetectedEvent,
  createRunAttemptStartedEvent,
  createRunAttemptUpdatedEvent
} from "./live-run-events.js";
import {
  classifyClaudeLiveRunIssue,
  collectClaudeLiveRunFailureText
} from "./live-run-issues.js";
import { formatLiveRunReadinessBlockMessage } from "./live-run-readiness.js";
import { buildDispatchPrompt } from "./runner-prompt.js";
import { listenToClaudeCodeStream } from "./stream-listener.js";

type WorkbenchRunnerResult = Awaited<ReturnType<DesktopDemoDocument["runSession"]>>;

export interface StartSessionOptions {
  readonly resumeSessionId?: string;
  readonly externalSessionId?: string;
  readonly promptOverride?: string;
  readonly permissionModeOverride?: WorkbenchPermissionMode;
  readonly trigger?: WorkbenchRunAttemptTrigger;
  readonly sourceApprovalId?: string;
}

export type StartWorkbenchSession = (
  mode: DesktopRunnerMode,
  options?: StartSessionOptions
) => Promise<void>;

export interface UseWorkbenchRunnerOptions {
  readonly composerPrompt: string;
  readonly controllerSnapshot: WorkbenchSessionControllerSnapshot;
  readonly document: DesktopDemoDocument;
  readonly i18n: UiI18n;
  readonly projectionSessions: readonly ProjectedSessionListItem[];
  readonly runtimeSnapshot: WorkbenchRuntimeSnapshot;
  readonly sessionDefaults: WorkbenchSessionDefaults;
  readonly selectionCatalog: WorkbenchSelectionCatalog;
  readonly setControllerSnapshot: (snapshot: WorkbenchSessionControllerSnapshot) => void;
  readonly setIgnoredRecordCount: (count: number) => void;
  readonly workspacePath: string;
}

export function useWorkbenchRunner({
  composerPrompt,
  controllerSnapshot,
  document,
  i18n,
  projectionSessions,
  runtimeSnapshot,
  sessionDefaults,
  selectionCatalog,
  setControllerSnapshot,
  setIgnoredRecordCount,
  workspacePath
}: UseWorkbenchRunnerOptions) {
  const [runnerStatus, setRunnerStatus] = useState("");
  const [runnerBusy, setRunnerBusy] = useState(false);
  const [activeRunSessionId, setActiveRunSessionId] = useState<string | undefined>();
  const [activeRunAttemptId, setActiveRunAttemptId] = useState<string | undefined>();
  const [activeRunMode, setActiveRunMode] = useState<DesktopRunnerMode | undefined>();
  const cancelledAttemptIds = useRef(new Set<string>());

  const startSession: StartWorkbenchSession = async (
    mode: DesktopRunnerMode,
    options: StartSessionOptions = {}
  ) => {
    if (runnerBusy) {
      return;
    }

    const isResumeRun = Boolean(options.resumeSessionId && options.externalSessionId);
    const nextIndex = controllerSnapshot.events.length + 1;
    const sessionId = options.resumeSessionId ?? `local-session-${Date.now()}`;
    const existingSession = projectionSessions.find((session) => session.id === sessionId);
    const title =
      existingSession?.title ??
      formatMessage(i18n.t("workbench.session.defaultTitle"), {
        index: projectionSessions.length + 1
      });
    const selectedWorkspacePath =
      existingSession?.workspacePath ??
      (workspacePath === "__all__" ? document.activeWorkspace.path : workspacePath);
    const prompt =
      options.promptOverride ??
      buildDispatchPrompt(mode, composerPrompt, i18n, {
        activeSession: controllerSnapshot.projection.activeSession
      });
    const request = document.createRunnerRequest({
      sessionId,
      title,
      prompt,
      externalSessionId: options.externalSessionId,
      languageSettings: runtimeSnapshot.languageSettings,
      permissionModeOverride: options.permissionModeOverride,
      sessionDefaults,
      workspacePath: selectedWorkspacePath
    });
    const attemptId = createRunAttemptId(mode, sessionId);
    const selectionSnapshot =
      mode === "claude-live"
        ? createSelectionSnapshotFromRequest(request, i18n, selectionCatalog)
        : undefined;
    const liveReadinessBlockMessage = selectionSnapshot
      ? formatLiveRunReadinessBlockMessage(selectionSnapshot, i18n)
      : undefined;
    const streamedEventKeys = new Set<string>();
    const appendEvents = async (
      events: readonly WorkbenchEvent[],
      appendOptions: { readonly markAsStreamed?: boolean } = {}
    ) => {
      const nextEvents = appendOptions.markAsStreamed
        ? events.filter((event) => {
            const key = workbenchEventIdentity(event);
            if (streamedEventKeys.has(key)) {
              return false;
            }
            streamedEventKeys.add(key);
            return true;
          })
        : events;

      if (nextEvents.length === 0) {
        return;
      }

      await document.eventStore.append(nextEvents);
      setControllerSnapshot(
        document.controller.appendEvents(nextEvents, { activateSessionId: sessionId })
      );
    };
    setRunnerBusy(true);
    setActiveRunSessionId(sessionId);
    setActiveRunAttemptId(attemptId);
    setActiveRunMode(mode);
    setRunnerStatus(
      mode === "claude-live" && isResumeRun
        ? i18n.t("workbench.runner.resumingClaude")
        : mode === "claude-live"
          ? i18n.t("workbench.runner.startingClaude")
          : i18n.t("workbench.runner.startingFixture")
    );

    let unlistenStream: (() => void) | undefined;
    try {
      await appendEvents([
        createRunAttemptStartedEvent(request, mode, attemptId, isResumeRun, {
          trigger: options.trigger,
          sourceApprovalId: options.sourceApprovalId
        })
      ]);

      if (mode === "claude-live") {
        const preludeEvents = createLiveRunPreludeEvents(
          request,
          title,
          i18n,
          isResumeRun,
          selectionCatalog
        );
        await appendEvents(preludeEvents);

        if (liveReadinessBlockMessage) {
          const blockedEvents = [
            ...createLiveRunReadinessBlockedEvents(sessionId, liveReadinessBlockMessage),
            createRunAttemptUpdatedEvent(sessionId, attemptId, "failed", {
              errorMessage: liveReadinessBlockMessage,
              failureKind: "readiness_blocked"
            })
          ];
          await appendEvents(blockedEvents);
          setRunnerStatus(liveReadinessBlockMessage);
          return;
        }

        unlistenStream = await listenToClaudeCodeStream(request, i18n, (events) =>
          appendEvents(events, { markAsStreamed: true })
        );
      }

      const result = await document.runSession(mode, request);
      const baseResultEvents =
        mode === "claude-live"
          ? [
              ...result.events.filter((event) => !streamedEventKeys.has(workbenchEventIdentity(event))),
              ...createLiveRunCompletionEvents(sessionId, result)
            ]
          : result.events;
      const exitCode = getRunnerExitCode(result);
      const attemptStatus =
        cancelledAttemptIds.current.has(attemptId)
          ? "cancelled"
          : exitCode !== undefined && exitCode !== 0
            ? "failed"
            : "succeeded";
      const runtimeIssue =
        mode === "claude-live" && attemptStatus === "failed"
          ? classifyClaudeLiveRunIssue({
              request,
              attemptId,
              message: collectClaudeLiveRunFailureText(result),
              i18n
            })
          : undefined;
      const resultEvents = [
        ...baseResultEvents,
        ...(runtimeIssue ? [createRunnerIssueDetectedEvent(sessionId, runtimeIssue)] : []),
        createRunAttemptUpdatedEvent(sessionId, attemptId, attemptStatus, {
          exitCode,
          eventCount: result.events.length,
          ignoredRecordCount: result.ignoredRecords.length,
          parseWarningCount: getRunnerParseWarningCount(result),
          failureKind: runtimeIssue?.kind
        })
      ];

      await appendEvents(resultEvents);
      setIgnoredRecordCount(result.ignoredRecords.length);
      setRunnerStatus(
        runtimeIssue
          ? `${runtimeIssue.title}: ${runtimeIssue.message}`
          : formatMessage(i18n.t("workbench.runner.appendedEvents"), {
              count: resultEvents.length,
              executable: result.command.executable,
              index: nextIndex,
              mode
            })
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : i18n.t("workbench.runner.failed");
      const runtimeIssue =
        mode === "claude-live"
          ? classifyClaudeLiveRunIssue({
              request,
              attemptId,
              message,
              i18n
            })
          : undefined;

      if (mode === "claude-live") {
        const failureEvents = [
          ...createLiveRunFailureEvents(sessionId, message),
          ...(runtimeIssue ? [createRunnerIssueDetectedEvent(sessionId, runtimeIssue)] : []),
          createRunAttemptUpdatedEvent(
            sessionId,
            attemptId,
            cancelledAttemptIds.current.has(attemptId) ? "cancelled" : "failed",
            {
              errorMessage: message,
              failureKind: runtimeIssue?.kind
            }
          )
        ];
        await appendEvents(failureEvents);
      } else {
        await appendEvents([
          createRunAttemptUpdatedEvent(sessionId, attemptId, "failed", {
            errorMessage: message
          })
        ]);
      }

      setRunnerStatus(runtimeIssue ? `${runtimeIssue.title}: ${runtimeIssue.message}` : message);
    } finally {
      unlistenStream?.();
      cancelledAttemptIds.current.delete(attemptId);
      setRunnerBusy(false);
      setActiveRunSessionId(undefined);
      setActiveRunAttemptId(undefined);
      setActiveRunMode(undefined);
    }
  };

  const cancelActiveRun = async () => {
    if (!activeRunSessionId || !activeRunAttemptId || activeRunMode !== "claude-live") {
      setRunnerStatus(i18n.t("workbench.runner.cancelFailed"));
      return;
    }

    const cancelled = await cancelTauriClaudeCodeStream(activeRunSessionId);
    if (cancelled) {
      cancelledAttemptIds.current.add(activeRunAttemptId);
    }
    const events = [
      ...createLiveRunCancelledEvents(activeRunSessionId, i18n, cancelled),
      createRunAttemptUpdatedEvent(
        activeRunSessionId,
        activeRunAttemptId,
        cancelled ? "cancelled" : "failed",
        {
          errorMessage: cancelled ? undefined : i18n.t("workbench.runner.cancelFailed")
        }
      )
    ];
    await document.eventStore.append(events);
    setControllerSnapshot(
      document.controller.appendEvents(events, { activateSessionId: activeRunSessionId })
    );
    setRunnerStatus(
      cancelled ? i18n.t("workbench.runner.cancelled") : i18n.t("workbench.runner.cancelFailed")
    );
  };

  return {
    activeRunMode,
    activeRunSessionId,
    cancelActiveRun,
    runnerBusy,
    runnerStatus,
    setRunnerStatus,
    startSession
  };
}

function createRunAttemptId(mode: DesktopRunnerMode, sessionId: string): string {
  return `attempt-${mode}-${sessionId}-${Date.now()}`;
}

function getRunnerExitCode(result: WorkbenchRunnerResult): number | undefined {
  return "exitCode" in result && typeof result.exitCode === "number" ? result.exitCode : undefined;
}

function getRunnerParseWarningCount(result: WorkbenchRunnerResult): number | undefined {
  return "parseErrors" in result ? result.parseErrors.length : undefined;
}
