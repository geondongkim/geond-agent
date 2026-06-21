import type {
  UiI18n,
  WorkbenchSelectionSnapshot
} from "@geond-agent/ui-workbench";

import type { RunnerRequest } from "../runs/types.js";

export function createSelectionSnapshotFromRequest(
  request: RunnerRequest,
  i18n: UiI18n
): WorkbenchSelectionSnapshot {
  return {
    backendAdapterId: request.backendAdapterId ?? "claude-code.external-cli-acp",
    providerRouteId: request.providerRouteId,
    modelProfileId: request.modelProfileId ?? request.modelAlias,
    routingMode: request.routingMode ?? "manual",
    uiLanguage: request.uiLanguage,
    agentResponseLanguage: normalizeSelectionAgentLanguage(request.agentResponseLanguage),
    capabilityWarnings: [i18n.t("workbench.liveWarning.selectionLocalOnly")]
  };
}

export function describeLiveCommandPreview(request: RunnerRequest): string {
  return [
    "claude --bare -p --verbose --output-format stream-json",
    `model: ${request.modelAlias ?? "sonnet"}`,
    `permission: ${request.permissionMode ?? "plan"}`,
    `workspace: ${request.workspacePath ?? request.cwd ?? "(default)"}`,
    `provider route: ${request.providerRouteId ?? "unknown"}`,
    `resume: ${request.externalSessionId ? "stored external session" : "new session"}`,
    `routing mode: ${request.routingMode ?? "manual"}`
  ].join("\n");
}

function normalizeSelectionAgentLanguage(
  value: string | undefined
): WorkbenchSelectionSnapshot["agentResponseLanguage"] | undefined {
  return value === "system" || value === "en" || value === "ko" ? value : undefined;
}
