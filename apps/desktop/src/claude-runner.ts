import { invoke } from "@tauri-apps/api/core";
import type {
  ClaudeCodeProcessExecutionResult,
  ClaudeCodeProcessExecutor
} from "@geond-agent/claude-code-bridge";

interface TauriClaudeCodeResponse {
  readonly stdout: string;
  readonly stderr: string;
  readonly exitCode?: number | null;
}

export function createTauriClaudeCodeExecutor(): ClaudeCodeProcessExecutor {
  return async (command): Promise<ClaudeCodeProcessExecutionResult> => {
    const result = await invoke<TauriClaudeCodeResponse>("run_claude_code_stream_json", {
      request: command
    });

    return {
      stdout: result.stdout,
      stderr: result.stderr,
      exitCode: result.exitCode
    };
  };
}
