import { describe, expect, it } from "vitest";

import { createClaudeCodeStreamJsonNormalizer } from "@geond-agent/claude-code-bridge";
import { createUiI18n } from "@geond-agent/ui-workbench";

import {
  createEventsFromCodexStreamPayload,
  createEventsFromStreamPayload
} from "./stream-listener.js";
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

  it("redacts secret-like content from stderr chunks", () => {
    const secretEnvName = ["ANTHROPIC", "API", "KEY"].join("_");
    const token = ["sk", "d".repeat(28)].join("-");
    const events = createEventsFromStreamPayload(
      {
        channelId: "workbench-session-1",
        stream: "stderr",
        text: `diagnostic ${secretEnvName}=${token}\n`,
        sequence: 1
      },
      createRunnerRequest(),
      createUiI18n("en"),
      createClaudeCodeStreamJsonNormalizer()
    );

    expect(events[0]).toMatchObject({
      type: "command.output",
      text: `diagnostic ${secretEnvName}=[redacted]`
    });
    expect(JSON.stringify(events)).not.toContain(token);
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

  it("redacts secret-like content from normalized stdout events", () => {
    const token = ["sk", "e".repeat(28)].join("-");
    const request = createRunnerRequest();
    const events = createEventsFromStreamPayload(
      {
        channelId: "workbench-session-1",
        stream: "stdout",
        text: JSON.stringify({
          type: "assistant.message.delta",
          session_id: "claude-session-1",
          message_id: "message-1",
          delta: `never persist ${token}`
        }),
        sequence: 2
      },
      request,
      createUiI18n("en"),
      createClaudeCodeStreamJsonNormalizer({
        fallbackSessionId: request.sessionId,
        workbenchSessionId: request.sessionId
      })
    );

    expect(events[0]).toMatchObject({
      type: "assistant.text.delta",
      text: "never persist [redacted]"
    });
    expect(JSON.stringify(events)).not.toContain(token);
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

  it("normalizes Codex stdout JSONL records under the workbench session id", () => {
    const events = createEventsFromCodexStreamPayload(
      {
        channelId: "workbench-session-1",
        stream: "stdout",
        text: JSON.stringify({
          type: "item.completed",
          item: {
            id: "codex-message-1",
            type: "agent_message",
            text: "Codex live output"
          }
        }),
        sequence: 2
      },
      createRunnerRequest({
        backendAdapterId: "codex.cli.metadata",
        modelAlias: "gpt-5.1-codex"
      }),
      createUiI18n("en")
    );

    expect(events[0]).toMatchObject({
      type: "assistant.text.completed",
      sessionId: "workbench-session-1",
      text: "Codex live output"
    });
  });

  it("maps Codex stderr chunks to redacted command output previews", () => {
    const token = ["sk", "f".repeat(28)].join("-");
    const events = createEventsFromCodexStreamPayload(
      {
        channelId: "workbench-session-1",
        stream: "stderr",
        text: `codex diagnostic ${token}`,
        sequence: 1
      },
      createRunnerRequest(),
      createUiI18n("en")
    );

    expect(events[0]).toMatchObject({
      type: "command.output",
      commandId: "codex-cli-stream-stderr",
      text: "codex diagnostic [redacted]"
    });
    expect(JSON.stringify(events)).not.toContain(token);
  });

  it("turns Codex live JSON parse failures into warnings", () => {
    const events = createEventsFromCodexStreamPayload(
      {
        channelId: "workbench-session-1",
        stream: "stdout",
        text: "{not-json}",
        sequence: 9
      },
      createRunnerRequest(),
      createUiI18n("en")
    );

    expect(events[0]).toMatchObject({
      type: "warning",
      id: "codex-cli-jsonl-live-parse-9"
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
