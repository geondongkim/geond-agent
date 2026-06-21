import { describe, expect, it } from "vitest";

import { createUiI18n } from "@geond-agent/ui-workbench";

import {
  createSelectionSnapshotFromRequest,
  describeLiveCommandPreview
} from "./selection-snapshot.js";
import type { RunnerRequest } from "../runs/types.js";

describe("desktop selection snapshot helpers", () => {
  it("creates local-only selection metadata without exposing provider secrets", () => {
    const snapshot = createSelectionSnapshotFromRequest(
      createRunnerRequest({
        agentResponseLanguage: "ko"
      }),
      createUiI18n("en")
    );

    expect(snapshot).toMatchObject({
      backendAdapterId: "claude-code.external-cli-acp",
      providerRouteId: "zai.anthropic-compatible",
      modelProfileId: "opus",
      routingMode: "manual",
      uiLanguage: "en",
      agentResponseLanguage: "ko"
    });
    expect(snapshot.capabilityWarnings).toEqual([
      "Live runner selection is a local snapshot; provider credentials are not stored in UI state."
    ]);
    expect(JSON.stringify(snapshot)).not.toMatch(/api[_-]?key|token|secret/i);
  });

  it("omits invalid agent response language values", () => {
    const snapshot = createSelectionSnapshotFromRequest(
      createRunnerRequest({ agentResponseLanguage: "jp" }),
      createUiI18n("en")
    );

    expect(snapshot.agentResponseLanguage).toBeUndefined();
  });

  it("distinguishes fresh and resumed live command previews", () => {
    expect(describeLiveCommandPreview(createRunnerRequest())).toContain("resume: new session");
    expect(
      describeLiveCommandPreview(
        createRunnerRequest({
          externalSessionId: "claude-session-1"
        })
      )
    ).toContain("resume: stored external session");
  });
});

function createRunnerRequest(
  overrides: Partial<RunnerRequest> = {}
): RunnerRequest {
  return {
    sessionId: "workbench-session-1",
    title: "Workbench session",
    prompt: "Inspect the workspace.",
    workspacePath: "/workspace/geond-agent",
    modelAlias: "opus",
    providerRouteId: "zai.anthropic-compatible",
    modelProfileId: "opus",
    backendAdapterId: "claude-code.external-cli-acp",
    routingMode: "manual",
    uiLanguage: "en",
    agentResponseLanguage: "system",
    ...overrides
  };
}
