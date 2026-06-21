import { describe, expect, it } from "vitest";

import { createUiI18n } from "@geond-agent/ui-workbench";

import {
  createLiveRunCancelledEvents,
  createLiveRunCompletionEvents,
  createLiveRunFailureEvents,
  createLiveRunPreludeEvents
} from "./live-run-events.js";
import { createDesktopWorkbenchCatalog } from "../lib/workbench-catalog.js";
import type { RunnerRequest, RunnerResult } from "./types.js";

describe("desktop live run event factories", () => {
  it("creates a fresh Claude Code prelude with selection and command preview events", () => {
    const events = createLiveRunPreludeEvents(
      createRunnerRequest(),
      "Fresh run",
      createUiI18n("en"),
      false,
      createDesktopWorkbenchCatalog()
    );

    expect(events.map((event) => event.type)).toEqual([
      "session.lifecycle",
      "plan.updated",
      "command.output",
      "warning"
    ]);
    expect(events[0]).toMatchObject({
      type: "session.lifecycle",
      sessionId: "workbench-session-1",
      lifecycle: "started",
      selection: {
        backendAdapterId: "claude-code.external-cli-acp",
        modelProfileId: "opus"
      }
    });
  });

  it("creates a resume prelude that links the external Claude Code session", () => {
    const events = createLiveRunPreludeEvents(
      createRunnerRequest({ externalSessionId: "claude-session-1" }),
      "Resume run",
      createUiI18n("en"),
      true,
      createDesktopWorkbenchCatalog()
    );

    expect(events.map((event) => event.type).slice(0, 3)).toEqual([
      "session.lifecycle",
      "session.adapter.linked",
      "selection.snapshot.updated"
    ]);
    expect(events[1]).toMatchObject({
      type: "session.adapter.linked",
      externalSessionId: "claude-session-1"
    });
  });

  it("summarizes completion, failure, and cancel states as normalized workbench events", () => {
    expect(
      createLiveRunCompletionEvents("workbench-session-1", createRunnerResult({ exitCode: 0 }))[1]
    ).toMatchObject({ type: "session.lifecycle", lifecycle: "completed" });
    expect(
      createLiveRunCompletionEvents("workbench-session-1", createRunnerResult({ exitCode: 2 }))[1]
    ).toMatchObject({ type: "session.lifecycle", lifecycle: "failed" });
    expect(createLiveRunFailureEvents("workbench-session-1", "boom").map((event) => event.type)).toEqual([
      "command.output",
      "error",
      "session.lifecycle"
    ]);
    expect(createLiveRunCancelledEvents("workbench-session-1", createUiI18n("en"), true)[0]).toMatchObject({
      type: "command.output",
      status: "interrupted"
    });
  });
});

function createRunnerRequest(overrides: Partial<RunnerRequest> = {}): RunnerRequest {
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

function createRunnerResult(overrides: Partial<RunnerResult> = {}): RunnerResult {
  return {
    command: {
      executable: "claude",
      args: ["--bare", "-p", "--verbose", "--output-format", "stream-json"],
      streamChannelId: "workbench-session-1"
    },
    events: [],
    ignoredRecords: [],
    parseErrors: [],
    exitCode: 0,
    ...overrides
  };
}
