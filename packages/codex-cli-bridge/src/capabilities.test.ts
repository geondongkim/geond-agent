import { describe, expect, it } from "vitest";

import {
  createBackendAdapterCatalog,
  createBackendAdapterOptions
} from "@geond-agent/backend-adapter-sdk";

import {
  CODEX_CLI_EXECUTION_POLICIES,
  buildCodexCliExecJsonCommand,
  codexJsonFlagForMode,
  createCodexCliBackendRegistryEntry,
  createCodexCliFixtureReplayRunner,
  mapExecutionPolicyToCodexApprovalPolicy,
  mapExecutionPolicyToCodexSandboxMode,
  parseCodexCliJsonlLines
} from "./index.js";

describe("Codex CLI metadata adapter", () => {
  it("describes a Codex backend boundary without launching Codex", () => {
    const entry = createCodexCliBackendRegistryEntry();

    expect(entry.kind).toBe("external-cli");
    expect(entry.capabilities.terminalOutput.state).toBe("supported");
    expect(entry.capabilities.toolCalls.state).toBe("unknown");
    expect(entry.notes?.join(" ")).toContain("Tauri native process launch boundaries exist");
  });

  it("uses SDK execution policy ids instead of Claude-specific permission names", () => {
    expect(CODEX_CLI_EXECUTION_POLICIES).toEqual([
      "plan",
      "ask-first",
      "accept-edits"
    ]);
    expect(CODEX_CLI_EXECUTION_POLICIES).not.toContain("bypassPermissions");
  });

  it("maps SDK execution policies to Codex sandbox and approval flags", () => {
    expect(mapExecutionPolicyToCodexSandboxMode("plan")).toBe("read-only");
    expect(mapExecutionPolicyToCodexSandboxMode("ask-first")).toBe("workspace-write");
    expect(mapExecutionPolicyToCodexSandboxMode("accept-edits")).toBe("workspace-write");
    expect(mapExecutionPolicyToCodexSandboxMode("bypass")).toBe("danger-full-access");
    expect(mapExecutionPolicyToCodexApprovalPolicy("plan")).toBe("untrusted");
    expect(mapExecutionPolicyToCodexApprovalPolicy("ask-first")).toBe("untrusted");
    expect(mapExecutionPolicyToCodexApprovalPolicy("accept-edits")).toBe("on-request");
    expect(mapExecutionPolicyToCodexApprovalPolicy("bypass")).toBe("never");
  });

  it("builds a JSONL exec command with ephemeral local state by default", () => {
    const command = buildCodexCliExecJsonCommand({
      prompt: "Review the current workbench session.",
      cwd: "/workspace/geond-agent",
      modelAlias: "gpt-5.1-codex",
      executionPolicy: "ask-first",
      timeoutMs: 120000
    });

    expect(command.executable).toBe("codex");
    expect(command.cwd).toBe("/workspace/geond-agent");
    expect(command.stdin).toBe("Review the current workbench session.");
    expect(command.timeoutMs).toBe(120000);
    expect(command.args).toEqual([
      "exec",
      "--json",
      "--sandbox",
      "workspace-write",
      "--config",
      'approval_policy="untrusted"',
      "--ephemeral",
      "--cd",
      "/workspace/geond-agent",
      "--model",
      "gpt-5.1-codex"
    ]);
  });

  it("builds a JSONL resume command when an external Codex session id is known", () => {
    const command = buildCodexCliExecJsonCommand({
      prompt: "Continue the prior session.",
      externalSessionId: "codex-session-1"
    });

    expect(command.args.slice(0, 3)).toEqual([
      "exec",
      "--json",
      "--sandbox"
    ]);
    expect(command.args.slice(-2)).toEqual(["resume", "codex-session-1"]);
    expect(command.stdin).toBe("Continue the prior session.");
  });

  it("parses Codex JSONL records into workbench events with ignored future records", () => {
    const parsed = parseCodexCliJsonlLines(
      [
        JSON.stringify({
          type: "thread.started",
          thread_id: "codex-external",
          title: "Codex session"
        }),
        JSON.stringify({
          type: "item.completed",
          item: {
            id: "message-1",
            type: "agent_message",
            text: "hello"
          }
        }),
        "{not-json}",
        JSON.stringify({ type: "future.event" })
      ].join("\n"),
      {
        fallbackSessionId: "workbench-codex-session",
        workbenchSessionId: "workbench-codex-session"
      }
    );

    expect(parsed.events.map((event) => event.type)).toEqual([
      "session.lifecycle",
      "session.adapter.linked",
      "assistant.text.completed"
    ]);
    expect(parsed.parseErrors).toHaveLength(1);
    expect(parsed.ignoredRecords).toEqual([
      {
        index: 2,
        type: "future.event",
        reason: "Codex JSONL record type is not mapped yet."
      }
    ]);
  });

  it("replays sanitized Codex JSONL fixtures through the runner boundary", async () => {
    const runner = createCodexCliFixtureReplayRunner();
    const result = await runner.run({
      sessionId: "codex-workbench-session",
      title: "Codex workbench session",
      workspacePath: "/workspace/geond-agent",
      prompt: "Inspect the Codex runner boundary.",
      modelAlias: "gpt-5.1-codex",
      routingMode: "manual",
      uiLanguage: "ko",
      agentResponseLanguage: "en"
    });

    expect(result.command.args).toContain("--json");
    expect(result.command.args).toContain("--ephemeral");
    expect(result.command.stdin).toBe("Inspect the Codex runner boundary.");
    expect(result.events[0]).toMatchObject({
      type: "session.lifecycle",
      sessionId: "codex-workbench-session",
      title: "Codex workbench session"
    });
    expect(result.events.map((event) => event.type)).toContain("diff.emitted");
    expect(result.events.map((event) => event.type)).toContain("tool.call.started");
    expect(result.events.map((event) => event.type)).toContain("usage.reported");
    expect(result.ignoredRecords).toHaveLength(1);
  });

  it("can be listed through SDK backend catalog helpers", () => {
    const catalog = createBackendAdapterCatalog({
      backendAdapters: [createCodexCliBackendRegistryEntry()]
    });

    expect(createBackendAdapterOptions(catalog)).toEqual([
      {
        value: "codex.cli.metadata",
        label: "Codex CLI metadata candidate",
        detail: "external-cli"
      }
    ]);
  });
});
  it("can opt into the upstream TypeScript SDK experimental JSON flag", () => {
    expect(codexJsonFlagForMode("stable")).toBe("--json");
    expect(codexJsonFlagForMode("experimental")).toBe("--experimental-json");
    expect(
      buildCodexCliExecJsonCommand({
        prompt: "Use the upstream-compatible event flag.",
        jsonOutputMode: "experimental"
      }).args
    ).toContain("--experimental-json");
  });
