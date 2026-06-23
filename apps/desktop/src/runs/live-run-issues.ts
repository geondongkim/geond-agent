import {
  type UiI18n,
  type WorkbenchRunnerIssueKind,
  type WorkbenchRunnerIssueSnapshot,
  type WorkbenchRunnerIssueSuggestedAction
} from "@geond-agent/ui-workbench";
import { redactSensitiveTextContent } from "@geond-agent/claude-code-bridge";

import type { RunnerRequest, RunnerResult } from "./types.js";

export interface LiveRunIssueClassificationInput {
  readonly request: RunnerRequest;
  readonly attemptId: string;
  readonly message: string;
  readonly i18n: UiI18n;
}

export function classifyClaudeLiveRunIssue({
  request,
  attemptId,
  message,
  i18n
}: LiveRunIssueClassificationInput): WorkbenchRunnerIssueSnapshot | undefined {
  const redactedMessage = redactSensitiveTextContent(message);
  const normalized = redactedMessage.toLowerCase();
  const kind = classifyIssueKind(normalized);

  if (!kind) {
    return undefined;
  }

  const suggestedAction = suggestedActionForIssue(kind);
  const title = issueTitle(i18n, kind);

  return {
    id: `issue-${attemptId}-${kind}`,
    kind,
    severity: "error",
    title,
    message: issueMessage(i18n, kind),
    retryable: kind !== "provider_auth",
    suggestedAction,
    backendAdapterId: request.backendAdapterId,
    providerRouteId: request.providerRouteId,
    modelProfileId: request.modelProfileId ?? request.modelAlias,
    attemptId,
    routeHealth: routeHealthForIssue(kind),
    detectedAt: new Date().toISOString()
  };
}

export function collectClaudeLiveRunFailureText(result: RunnerResult): string {
  const eventText = result.events
    .flatMap((event) => {
      switch (event.type) {
        case "assistant.text.delta":
        case "assistant.text.completed":
          return [event.text ?? ""];
        case "command.output":
          return [event.text];
        case "warning":
        case "error":
          return [event.message];
        case "run.attempt.updated":
          return [event.errorMessage ?? ""];
        default:
          return [];
      }
    })
    .filter((value) => value.length > 0)
    .join("\n");

  const parseWarnings = "parseErrors" in result ? result.parseErrors.join("\n") : "";
  const stderrPreview = "stderrPreview" in result ? result.stderrPreview ?? "" : "";

  return [eventText, parseWarnings, stderrPreview]
    .filter((value) => value.length > 0)
    .join("\n");
}

function classifyIssueKind(value: string): WorkbenchRunnerIssueKind | undefined {
  if (
    value.includes("529") ||
    value.includes("overloaded") ||
    value.includes("temporarily overloaded")
  ) {
    return "provider_overloaded";
  }

  if (
    value.includes("401") ||
    value.includes("403") ||
    value.includes("unauthorized") ||
    value.includes("forbidden") ||
    value.includes("invalid api key") ||
    value.includes("authentication")
  ) {
    return "provider_auth";
  }

  if (
    value.includes("429") ||
    value.includes("quota") ||
    value.includes("rate limit") ||
    value.includes("rate_limit")
  ) {
    return "provider_quota";
  }

  if (
    value.includes("timeout") ||
    value.includes("timed out") ||
    value.includes("etimedout")
  ) {
    return "provider_timeout";
  }

  return undefined;
}

function suggestedActionForIssue(
  kind: WorkbenchRunnerIssueKind
): WorkbenchRunnerIssueSuggestedAction {
  switch (kind) {
    case "provider_overloaded":
    case "provider_quota":
    case "provider_timeout":
      return "retry_later";
    case "provider_auth":
      return "check_key";
    case "runner_process":
    case "readiness_blocked":
    case "unknown":
      return "inspect_terminal";
  }
}

function issueTitle(i18n: UiI18n, kind: WorkbenchRunnerIssueKind): string {
  switch (kind) {
    case "provider_overloaded":
      return i18n.t("workbench.issue.kind.providerOverloaded");
    case "provider_auth":
      return i18n.t("workbench.issue.kind.providerAuth");
    case "provider_quota":
      return i18n.t("workbench.issue.kind.providerQuota");
    case "provider_timeout":
      return i18n.t("workbench.issue.kind.providerTimeout");
    case "readiness_blocked":
      return i18n.t("workbench.issue.kind.readinessBlocked");
    case "runner_process":
    case "unknown":
      return i18n.t("workbench.issue.kind.runnerProcess");
  }
}

function issueMessage(i18n: UiI18n, kind: WorkbenchRunnerIssueKind): string {
  switch (kind) {
    case "provider_overloaded":
      return i18n.t("workbench.issue.providerOverloadedMessage");
    case "provider_auth":
      return i18n.t("workbench.issue.providerAuthMessage");
    case "provider_quota":
      return i18n.t("workbench.issue.providerQuotaMessage");
    case "provider_timeout":
      return i18n.t("workbench.issue.providerTimeoutMessage");
    case "readiness_blocked":
    case "runner_process":
    case "unknown":
      return i18n.t("workbench.issue.runnerProcessMessage");
  }
}

function routeHealthForIssue(
  kind: WorkbenchRunnerIssueKind
): WorkbenchRunnerIssueSnapshot["routeHealth"] {
  switch (kind) {
    case "provider_overloaded":
    case "provider_quota":
      return "degraded";
    case "provider_auth":
    case "provider_timeout":
      return "unavailable";
    case "readiness_blocked":
    case "runner_process":
    case "unknown":
      return "unknown";
  }
}
