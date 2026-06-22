import { useState } from "react";
import {
  workbenchEventIdentity,
  type UiI18n,
  type WorkbenchEvent,
  type WorkbenchPermissionMode,
  type WorkbenchRuntimeSnapshot,
  type WorkbenchSessionControllerSnapshot,
  type WorkbenchSessionDefaults,
  type WorkbenchSelectionCatalog
} from "@geond-agent/ui-workbench";

import { cancelTauriClaudeCodeStream } from "../claude-runner.js";
import type { DesktopDemoDocument, DesktopRunnerMode } from "../demo-workbench.js";
import type { ProjectedSessionListItem } from "../lib/workbench-types.js";
import { formatMessage } from "../lib/workbench-format.js";
import {
  createLiveRunCancelledEvents,
  createLiveRunCompletionEvents,
  createLiveRunFailureEvents,
  createLiveRunPreludeEvents
} from "./live-run-events.js";
import { createRunnerPrompt } from "./runner-prompt.js";
import { listenToClaudeCodeStream } from "./stream-listener.js";

export interface StartSessionOptions {
  readonly resumeSessionId?: string;
  readonly externalSessionId?: string;
  readonly promptOverride?: string;
  readonly permissionModeOverride?: WorkbenchPermissionMode;
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
  const [activeRunMode, setActiveRunMode] = useState<DesktopRunnerMode | undefined>();

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
      createRunnerPrompt(mode, composerPrompt, i18n, {
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
      if (mode === "claude-live") {
        unlistenStream = await listenToClaudeCodeStream(request, i18n, (events) =>
          appendEvents(events, { markAsStreamed: true })
        );
        const preludeEvents = createLiveRunPreludeEvents(
          request,
          title,
          i18n,
          isResumeRun,
          selectionCatalog
        );
        await appendEvents(preludeEvents);
      }

      const result = await document.runSession(mode, request);
      const resultEvents =
        mode === "claude-live"
          ? [
              ...result.events.filter((event) => !streamedEventKeys.has(workbenchEventIdentity(event))),
              ...createLiveRunCompletionEvents(sessionId, result)
            ]
          : result.events;

      await appendEvents(resultEvents);
      setIgnoredRecordCount(result.ignoredRecords.length);
      setRunnerStatus(
        formatMessage(i18n.t("workbench.runner.appendedEvents"), {
          count: resultEvents.length,
          executable: result.command.executable,
          index: nextIndex,
          mode
        })
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : i18n.t("workbench.runner.failed");

      if (mode === "claude-live") {
        const failureEvents = createLiveRunFailureEvents(sessionId, message);
        await appendEvents(failureEvents);
      }

      setRunnerStatus(message);
    } finally {
      unlistenStream?.();
      setRunnerBusy(false);
      setActiveRunSessionId(undefined);
      setActiveRunMode(undefined);
    }
  };

  const cancelActiveRun = async () => {
    if (!activeRunSessionId || activeRunMode !== "claude-live") {
      setRunnerStatus(i18n.t("workbench.runner.cancelFailed"));
      return;
    }

    const cancelled = await cancelTauriClaudeCodeStream(activeRunSessionId);
    const events = createLiveRunCancelledEvents(activeRunSessionId, i18n, cancelled);
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
