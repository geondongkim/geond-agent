import { describe, expect, it } from "vitest";

import {
  buildClaudeCodeApprovalFollowUpPrompt,
  buildClaudeCodeStreamJsonCommand,
  createClaudeCodeFixtureReplayRunner,
  createClaudeCodeProcessRunner,
  parseClaudeCodeStreamJsonLines,
  selectClaudeCodeApprovalFollowUpPermissionMode
} from "./runner.js";

describe("Claude Code runner boundary", () => {
  it("builds a stream-json command without sending local ids as Claude session ids", () => {
    const command = buildClaudeCodeStreamJsonCommand({
      prompt: "Summarize the current workbench session.",
      cwd: "/workspace/geond-agent",
      modelAlias: "opus",
      permissionMode: "plan",
      sessionId: "session-1",
      timeoutMs: 120000
    });

    expect(command.executable).toBe("claude");
    expect(command.cwd).toBe("/workspace/geond-agent");
    expect(command.timeoutMs).toBe(120000);
    expect(command.streamChannelId).toBe("session-1");
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
      "Summarize the current workbench session."
    ]);
  });

  it("passes a Claude Code UUID session id when one is explicitly available", () => {
    const command = buildClaudeCodeStreamJsonCommand({
      prompt: "Summarize the current workbench session.",
      sessionId: "fffcc6bc-5c84-4332-97da-0651f2dbeaeb"
    });

    expect(command.args).toEqual([
      "--bare",
      "-p",
      "--verbose",
      "--output-format",
      "stream-json",
      "--model",
      "sonnet",
      "--permission-mode",
      "plan",
      "--session-id",
      "fffcc6bc-5c84-4332-97da-0651f2dbeaeb",
      "Summarize the current workbench session."
    ]);
  });

  it("uses Claude Code --resume when an external session id is known", () => {
    const command = buildClaudeCodeStreamJsonCommand({
      prompt: "Continue the prior turn.",
      sessionId: "workbench-session-1",
      externalSessionId: "fffcc6bc-5c84-4332-97da-0651f2dbeaeb"
    });

    expect(command.args).toContain("--resume");
    expect(command.streamChannelId).toBe("workbench-session-1");
    expect(command.args).toContain("fffcc6bc-5c84-4332-97da-0651f2dbeaeb");
    expect(command.args).not.toContain("--session-id");
    expect(command.args).not.toContain("workbench-session-1");
  });

  it("does not send non-UUID external session ids to Claude Code resume", () => {
    const command = buildClaudeCodeStreamJsonCommand({
      prompt: "Continue the prior turn.",
      sessionId: "workbench-session-1",
      externalSessionId: "claude-session-1"
    });

    expect(command.args).not.toContain("--resume");
    expect(command.args).not.toContain("--session-id");
    expect(command.streamChannelId).toBe("workbench-session-1");
  });

  it("builds a scoped print-mode follow-up prompt for approved approvals", () => {
    const prompt = buildClaudeCodeApprovalFollowUpPrompt({
      decision: "approved",
      approval: {
        id: "approval-command",
        kind: "command",
        title: "Run verification",
        subject: "pnpm verify",
        reason: "Validate the changed workspace"
      }
    });

    expect(prompt).toContain("Approval decision: approved.");
    expect(prompt).toContain("Approval kind: command.");
    expect(prompt).toContain("Approval subject: pnpm verify.");
    expect(prompt).toContain("Do not assume broader permission");
    expect(prompt).not.toMatch(secretValuePattern);
  });

  it("selects safe follow-up permission modes without using bypassPermissions", () => {
    expect(
      selectClaudeCodeApprovalFollowUpPermissionMode({ kind: "filesystem" }, "approved")
    ).toBe("acceptEdits");
    expect(
      selectClaudeCodeApprovalFollowUpPermissionMode({ kind: "diff" }, "approved")
    ).toBe("acceptEdits");
    expect(
      selectClaudeCodeApprovalFollowUpPermissionMode({ kind: "command" }, "approved")
    ).toBe("default");
    expect(
      selectClaudeCodeApprovalFollowUpPermissionMode({ kind: "network" }, "approved")
    ).toBe("default");
    expect(
      selectClaudeCodeApprovalFollowUpPermissionMode({ kind: "mcp" }, "approved")
    ).toBe("default");
    expect(
      selectClaudeCodeApprovalFollowUpPermissionMode({ kind: "filesystem" }, "rejected")
    ).toBe("plan");
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
        exitCode: 0,
        stdoutTruncated: true
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
    expect(result.events).toContainEqual(
      expect.objectContaining({
        type: "warning",
        id: "claude-code-output-truncated"
      })
    );
    expect(result.parseErrors).toHaveLength(1);
  });

  it("keeps live process output under the requested workbench session id", async () => {
    const externalSessionId = "fffcc6bc-5c84-4332-97da-0651f2dbeaeb";
    const runner = createClaudeCodeProcessRunner(async () => ({
      stdout: JSON.stringify({
        type: "system",
        subtype: "init",
        session_id: externalSessionId,
        model: "glm-5.2"
      }),
      exitCode: 0
    }));

    const result = await runner.run({
      sessionId: "workbench-session-live",
      externalSessionId,
      title: "Live resume",
      prompt: "Continue",
      modelAlias: "opus"
    });

    expect(result.command.args).toContain("--resume");
    expect(result.events[0]).toMatchObject({
      type: "session.lifecycle",
      sessionId: "workbench-session-live",
      lifecycle: "resumed"
    });
    expect(result.events[1]).toMatchObject({
      type: "session.adapter.linked",
      sessionId: "workbench-session-live",
      externalSessionId
    });
  });
});

const secretValuePattern = new RegExp(
  [
    ["ZAI", "API", "KEY"].join("_") + "=",
    ["ANTHROPIC", "API", "KEY"].join("_") + "=",
    "sk-[A-Za-z0-9_-]{20,}",
    "Bearer [A-Za-z0-9._-]{20,}"
  ].join("|")
);
