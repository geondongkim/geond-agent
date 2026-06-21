import {
  createWorkbenchSessionResumeEvents,
  createWorkbenchSessionStartEvents,
  type UiI18n,
  type WorkbenchEvent
} from "@geond-agent/ui-workbench";

import { createSelectionSnapshotFromRequest, describeLiveCommandPreview } from "../lib/selection-snapshot.js";
import type { RunnerRequest, RunnerResult } from "./types.js";

export function createLiveRunPreludeEvents(
  request: RunnerRequest,
  title: string,
  i18n: UiI18n,
  isResumeRun: boolean
): readonly WorkbenchEvent[] {
  const at = new Date().toISOString();
  const sessionPrelude =
    isResumeRun && request.externalSessionId
      ? [
          ...createWorkbenchSessionResumeEvents({
            sessionId: request.sessionId,
            adapterId: request.backendAdapterId ?? "claude-code.external-cli-acp",
            externalSessionId: request.externalSessionId,
            at
          }),
          {
            type: "selection.snapshot.updated" as const,
            sessionId: request.sessionId,
            selection: createSelectionSnapshotFromRequest(request, i18n),
            at
          }
        ]
      : createWorkbenchSessionStartEvents({
          sessionId: request.sessionId,
          title,
          workspacePath: request.workspacePath,
          selection: createSelectionSnapshotFromRequest(request, i18n),
          at
        });

  return [
    ...sessionPrelude,
    {
      type: "plan.updated",
      sessionId: request.sessionId,
      items: [
        {
          id: "launch-claude-code",
          title: i18n.t("workbench.livePlan.launch"),
          status: "in_progress"
        },
        {
          id: "normalize-events",
          title: i18n.t("workbench.livePlan.normalize"),
          status: "pending"
        },
        {
          id: "inspect-workbench",
          title: i18n.t("workbench.livePlan.inspect"),
          status: "pending"
        }
      ],
      at
    },
    {
      type: "command.output",
      sessionId: request.sessionId,
      commandId: "claude-code-live-prelude",
      stream: "status",
      text: describeLiveCommandPreview(request),
      status: "running",
      at
    },
    {
      type: "warning",
      sessionId: request.sessionId,
      id: "claude-code-local-only-boundary",
      message: i18n.t("workbench.liveWarning.localOnly"),
      at
    }
  ];
}

export function createLiveRunCompletionEvents(
  sessionId: string,
  result: RunnerResult
): readonly WorkbenchEvent[] {
  const at = new Date().toISOString();
  const exitCode = getRunnerExitCode(result);
  const failed = exitCode !== undefined && exitCode !== 0;
  const parseErrorCount = "parseErrors" in result ? result.parseErrors.length : 0;

  return [
    {
      type: "command.output",
      sessionId,
      commandId: "claude-code-live-prelude",
      stream: "status",
      text: [
        `normalized events: ${result.events.length}`,
        `ignored records: ${result.ignoredRecords.length}`,
        `parse warnings: ${parseErrorCount}`
      ].join("\n"),
      status: failed ? "failed" : "succeeded",
      exitCode,
      at
    },
    {
      type: "session.lifecycle",
      sessionId,
      lifecycle: failed ? "failed" : "completed",
      at
    }
  ];
}

export function createLiveRunFailureEvents(
  sessionId: string,
  message: string
): readonly WorkbenchEvent[] {
  const at = new Date().toISOString();

  return [
    {
      type: "command.output",
      sessionId,
      commandId: "claude-code-live-prelude",
      stream: "stderr",
      text: message,
      status: "failed",
      at
    },
    {
      type: "error",
      sessionId,
      id: "claude-code-live-runner-failed",
      message,
      at
    },
    {
      type: "session.lifecycle",
      sessionId,
      lifecycle: "failed",
      at
    }
  ];
}

export function createLiveRunCancelledEvents(
  sessionId: string,
  i18n: UiI18n,
  cancelled: boolean
): readonly WorkbenchEvent[] {
  const at = new Date().toISOString();
  const message = cancelled
    ? i18n.t("workbench.runner.cancelled")
    : i18n.t("workbench.runner.cancelFailed");

  return [
    {
      type: "command.output",
      sessionId,
      commandId: "claude-code-live-prelude",
      stream: cancelled ? "status" : "stderr",
      text: message,
      status: cancelled ? "interrupted" : "failed",
      at
    },
    {
      type: cancelled ? "warning" : "error",
      sessionId,
      id: cancelled
        ? "claude-code-live-runner-cancel-requested"
        : "claude-code-live-runner-cancel-failed",
      message,
      at
    }
  ];
}

function getRunnerExitCode(result: RunnerResult): number | undefined {
  if (!("exitCode" in result) || typeof result.exitCode !== "number") {
    return undefined;
  }

  return result.exitCode;
}
