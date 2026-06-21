import { describe, expect, it } from "vitest";

import { createClaudeCodeStreamJsonNormalizer } from "@geond-agent/claude-code-bridge";
import { createUiI18n } from "@geond-agent/ui-workbench";

import { createEventsFromStreamPayload } from "./stream-listener.js";
import type { RunnerRequest } from "./types.js";

describe("desktop Claude Code stream listener helpers", () => {
  it("ignores malformed payloads and payloads from other stream channels", () => {
    const normalizer = createClaudeCodeStreamJsonNormalizer();

    expect(
      createEventsFromStreamPayload(
        { channelId: "other", stream: "stdout", text: "{}", sequence: 1 },
        createRunnerRequest(),
        createUiI18n("en"),
        normalizer
      )
    ).toEqual([]);
    expect(
      createEventsFromStreamPayload(
        {
          channelId: "workbench-session-1",
          stream: "stdout",
          text: "{}",
          sequence: "bad"
        } as never,
        createRunnerRequest(),
        createUiI18n("en"),
        normalizer
      )
    ).toEqual([]);
  });

  it("maps stderr chunks to command output previews", () => {
    const events = createEventsFromStreamPayload(
      {
        channelId: "workbench-session-1",
        stream: "stderr",
        text: "diagnostic\n",
        sequence: 1
      },
      createRunnerRequest(),
      createUiI18n("en"),
      createClaudeCodeStreamJsonNormalizer()
    );

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      type: "command.output",
      sessionId: "workbench-session-1",
      stream: "stderr",
      text: "diagnostic"
    });
  });

  it("normalizes stdout stream-json records under the workbench session id", () => {
    const request = createRunnerRequest({ externalSessionId: "claude-session-1" });
    const normalizer = createClaudeCodeStreamJsonNormalizer({
      fallbackSessionId: request.sessionId,
      workbenchSessionId: request.sessionId,
      resumedFromExternalSessionId: request.externalSessionId
    });
    const events = createEventsFromStreamPayload(
      {
        channelId: "workbench-session-1",
        stream: "stdout",
        text: JSON.stringify({
          type: "system",
          subtype: "init",
          session_id: "claude-session-1",
          model: "glm-5.2",
          cwd: "/workspace/geond-agent"
        }),
        sequence: 1
      },
      request,
      createUiI18n("en"),
      normalizer
    );

    expect(events.map((event) => event.type)).toEqual([
      "session.lifecycle",
      "session.adapter.linked"
    ]);
    expect(events.every((event) => event.sessionId === "workbench-session-1")).toBe(true);
  });

  it("turns live JSON parse failures into warnings", () => {
    const events = createEventsFromStreamPayload(
      {
        channelId: "workbench-session-1",
        stream: "stdout",
        text: "{not-json}",
        sequence: 7
      },
      createRunnerRequest(),
      createUiI18n("en"),
      createClaudeCodeStreamJsonNormalizer()
    );

    expect(events[0]).toMatchObject({
      type: "warning",
      id: "claude-code-stream-json-live-parse-7"
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
