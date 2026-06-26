import { beforeEach, describe, expect, it, vi } from "vitest";

import { buildCodexCliExecJsonCommand } from "@geond-agent/codex-cli-bridge";

import { createTauriCodexCliExecutor, probeTauriCodexCliExecutable } from "./codex-runner.js";

const tauriMocks = vi.hoisted(() => ({
  invoke: vi.fn()
}));

vi.mock("@tauri-apps/api/core", () => ({
  invoke: tauriMocks.invoke
}));

describe("Tauri Codex CLI runner", () => {
  beforeEach(() => {
    tauriMocks.invoke.mockReset();
  });

  it("passes Codex prompts through stdin instead of visible argv", async () => {
    tauriMocks.invoke.mockResolvedValue({
      stdout: "",
      stderr: "",
      exitCode: 0,
      stdoutTruncated: false,
      stderrTruncated: false
    });
    const command = buildCodexCliExecJsonCommand({
      prompt: "Inspect the private workspace context.",
      cwd: "/workspace/geond-agent",
      modelAlias: "gpt-5.1-codex"
    });

    await createTauriCodexCliExecutor()(command);

    expect(tauriMocks.invoke).toHaveBeenCalledWith("run_codex_cli_jsonl", {
      request: command
    });
    expect(command.stdin).toBe("Inspect the private workspace context.");
    expect(command.args.join(" ")).not.toContain("private workspace context");
  });

  it("probes the user-installed codex executable only", async () => {
    tauriMocks.invoke.mockResolvedValue({
      available: true,
      executable: "codex",
      version: "codex-cli 0.142.0"
    });

    const result = await probeTauriCodexCliExecutable();

    expect(result).toMatchObject({
      state: "available",
      executable: "codex",
      version: "codex-cli 0.142.0"
    });
    expect(tauriMocks.invoke).toHaveBeenCalledWith("probe_codex_cli_executable", {
      request: { executable: "codex" }
    });
  });
});
