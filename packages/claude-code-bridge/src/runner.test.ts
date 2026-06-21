import { describe, expect, it } from "vitest";

import {
  buildClaudeCodeStreamJsonCommand,
  createClaudeCodeFixtureReplayRunner,
  createClaudeCodeProcessRunner,
  parseClaudeCodeStreamJsonLines
} from "./runner.js";

describe("Claude Code runner boundary", () => {
  it("builds a stream-json command without executing Claude Code", () => {
    const command = buildClaudeCodeStreamJsonCommand({
      prompt: "Summarize the current workbench session.",
      cwd: "/workspace/geond-agent",
      modelAlias: "opus",
      permissionMode: "plan",
      sessionId: "session-1"
    });

    expect(command.executable).toBe("claude");
    expect(command.cwd).toBe("/workspace/geond-agent");
    expect(command.args).toEqual([
      "--bare",
      "-p",
      "--verbose",
      "--output-format",
      "stream-json",
      "--model",
      "opus",
      "--permission-mode",
      "plan",
      "--session-id",
      "session-1",
      "Summarize the current workbench session."
    ]);
  });

  it("parses newline-delimited stream-json records into normalized events", () => {
    const parsed = parseClaudeCodeStreamJsonLines(
      [
        JSON.stringify({
          type: "session.started",
          session_id: "session-1",
          title: "Parsed session"
        }),
        "{not-json}"
      ].join("\n")
    );

    expect(parsed.events[0]?.type).toBe("session.lifecycle");
    expect(parsed.parseErrors).toHaveLength(1);
  });

  it("replays sanitized fixtures for a requested local session", async () => {
    const runner = createClaudeCodeFixtureReplayRunner();
    const result = await runner.run({
      sessionId: "local-run-1",
      title: "Local runner session",
      workspacePath: "/workspace/geond-agent",
      prompt: "Start a demo session",
      modelAlias: "sonnet",
      providerRouteId: "zai.anthropic-compatible",
      modelProfileId: "sonnet",
      routingMode: "manual",
      uiLanguage: "ko",
      agentResponseLanguage: "en"
    });

    expect(result.command.args).toContain("stream-json");
    expect(result.events[0]).toMatchObject({
      type: "session.lifecycle",
      sessionId: "local-run-1",
      title: "Local runner session"
    });
    expect(result.events.map((event) => event.type)).toContain("diff.emitted");
    expect(result.ignoredRecords).toHaveLength(1);
  });

  it("preserves system agent response language in the selection snapshot", async () => {
    const runner = createClaudeCodeFixtureReplayRunner();
    const result = await runner.run({
      sessionId: "local-run-system-language",
      title: "System language session",
      prompt: "Start a demo session",
      modelAlias: "opus",
      providerRouteId: "zai.anthropic-compatible",
      modelProfileId: "opus",
      routingMode: "auto",
      uiLanguage: "en",
      agentResponseLanguage: "system"
    });

    expect(result.events[0]).toMatchObject({
      type: "session.lifecycle",
      selection: {
        modelProfileId: "opus",
        routingMode: "auto",
        uiLanguage: "en",
        agentResponseLanguage: "system"
      }
    });
  });

  it("runs stream-json process output through the normalizer boundary", async () => {
    const runner = createClaudeCodeProcessRunner(async (command) => {
      expect(command.executable).toBe("claude");
      expect(command.args).toContain("stream-json");

      return {
        stdout: [
          JSON.stringify({
            type: "session.started",
            session_id: "live-run-1",
            title: "Live run",
            model_profile_id: "opus",
            routing_mode: "auto"
          }),
          "{not-json}"
        ].join("\n"),
        stderr: "Synthetic stderr diagnostic",
        exitCode: 0
      };
    });

    const result = await runner.run({
      sessionId: "live-run-1",
      title: "Live run",
      prompt: "Probe Claude Code",
      modelAlias: "opus",
      routingMode: "auto"
    });

    expect(result.events[0]).toMatchObject({
      type: "session.lifecycle",
      sessionId: "live-run-1",
      title: "Live run"
    });
    expect(result.events).toContainEqual(
      expect.objectContaining({
        type: "command.output",
        stream: "stderr",
        text: "Synthetic stderr diagnostic"
      })
    );
    expect(result.parseErrors).toHaveLength(1);
  });
});
