import { describe, expect, it } from "vitest";

import { createUiI18n } from "@geond-agent/ui-workbench";

import {
  createSelectionSnapshotFromRequest,
  describeCodexCommandPreview,
  describeLiveCommandPreview
} from "./selection-snapshot.js";
import { createDesktopWorkbenchCatalog } from "./workbench-catalog.js";
import type { RunnerRequest } from "../runs/types.js";

describe("desktop selection snapshot helpers", () => {
  it("creates local-only selection metadata without exposing provider secrets", () => {
    const snapshot = createSelectionSnapshotFromRequest(
      createRunnerRequest({
        agentResponseLanguage: "ko"
      }),
      createUiI18n("en"),
      createDesktopWorkbenchCatalog()
    );

    expect(snapshot).toMatchObject({
      backendAdapterId: "claude-code.external-cli-acp",
      providerRouteId: "zai.anthropic-compatible",
      modelProfileId: "opus",
      routingMode: "manual",
      uiLanguage: "en",
      agentResponseLanguage: "ko",
      readiness: {
        level: "blocked"
      }
    });
    expect(snapshot.readiness?.items.map((item) => [item.id, item.level])).toContainEqual([
      "provider-route",
      "blocked"
    ]);
    expect(snapshot.capabilityWarnings).toEqual([
      "Live runner selection is a local snapshot; provider credentials are not stored in UI state.",
      "Z.ai Anthropic-compatible route key presence is not stored in workbench events."
    ]);
    expect(JSON.stringify(snapshot)).not.toMatch(secretValuePattern);
  });

  it("keeps readiness as metadata even when local key presence is available", () => {
    const snapshot = createSelectionSnapshotFromRequest(
      createRunnerRequest(),
      createUiI18n("en"),
      createDesktopWorkbenchCatalog({ hasApiKey: true })
    );

    expect(snapshot.readiness?.level).toBe("attention");
    expect(snapshot.readiness?.items.map((item) => item.id)).toEqual([
      "backend-adapter",
      "provider-route",
      "model-profile",
      "routing-mode"
    ]);
    expect(JSON.stringify(snapshot)).not.toMatch(secretValuePattern);
  });

  it("omits invalid agent response language values", () => {
    const snapshot = createSelectionSnapshotFromRequest(
      createRunnerRequest({ agentResponseLanguage: "jp" }),
      createUiI18n("en"),
      createDesktopWorkbenchCatalog()
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

  it("describes Codex command previews without logging prompt text as argv", () => {
    const preview = describeCodexCommandPreview(
      createRunnerRequest({
        backendAdapterId: "codex.cli.metadata",
        providerRouteId: undefined,
        modelAlias: "gpt-5.1-codex"
      })
    );

    expect(preview).toContain("codex exec --json");
    expect(preview).toContain("prompt: provided");
    expect(preview).not.toContain("Inspect the workspace.");
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

const secretValuePattern = new RegExp(
  [
    ["ZAI", "API", "KEY"].join("_") + "=",
    ["ANTHROPIC", "API", "KEY"].join("_") + "=",
    "sk-[A-Za-z0-9_-]{20,}",
    "Bearer [A-Za-z0-9._-]{20,}"
  ].join("|")
);
