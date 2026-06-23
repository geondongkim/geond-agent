import {
  createMissingProviderKeyWarning,
  createSelectionReadiness,
  createUnknownModelWarning,
  describeBackendAdapter,
  describeProviderRoute,
  resolveModelProfile
} from "@geond-agent/ui-workbench";
import type {
  UiI18n,
  WorkbenchSelectionCatalog,
  WorkbenchSelectionSnapshot
} from "@geond-agent/ui-workbench";

import type { RunnerRequest } from "../runs/types.js";

export function createSelectionSnapshotFromRequest(
  request: RunnerRequest,
  i18n: UiI18n,
  selectionCatalog: WorkbenchSelectionCatalog
): WorkbenchSelectionSnapshot {
  const backendAdapterId = request.backendAdapterId ?? "claude-code.external-cli-acp";
  const providerRoute = describeProviderRoute(selectionCatalog, request.providerRouteId);
  const modelProfileId = request.modelProfileId ?? request.modelAlias;
  const modelProfile = resolveModelProfile(
    selectionCatalog,
    modelProfileId,
    request.providerRouteId
  );
  const capabilityWarnings = [
    i18n.t("workbench.liveWarning.selectionLocalOnly"),
    ...(providerRoute?.apiKeyState === "missing"
      ? [createMissingProviderKeyWarning(providerRoute)]
      : []),
    ...(modelProfileId && !modelProfile ? [createUnknownModelWarning(modelProfileId)] : [])
  ];
  const snapshot: WorkbenchSelectionSnapshot = {
    backendAdapterId,
    providerRouteId: request.providerRouteId,
    modelProfileId,
    routingMode: request.routingMode ?? "manual",
    backendAdapter: describeBackendAdapter(selectionCatalog, backendAdapterId),
    providerRoute,
    modelProfile,
    uiLanguage: request.uiLanguage,
    agentResponseLanguage: normalizeSelectionAgentLanguage(request.agentResponseLanguage),
    capabilityWarnings
  };

  return {
    ...snapshot,
    readiness: createSelectionReadiness(snapshot)
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
