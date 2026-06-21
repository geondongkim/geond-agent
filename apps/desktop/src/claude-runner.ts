import { invoke } from "@tauri-apps/api/core";
import type {
  ClaudeCodeProcessExecutionResult,
  ClaudeCodeProcessExecutor
} from "@geond-agent/claude-code-bridge";

interface TauriClaudeCodeResponse {
  readonly stdout: string;
  readonly stderr: string;
  readonly exitCode?: number | null;
  readonly stdoutTruncated?: boolean;
  readonly stderrTruncated?: boolean;
}

export const CLAUDE_CODE_STREAM_EVENT = "geond-agent://claude-code-stream-json";

export interface TauriClaudeCodeStreamPayload {
  readonly channelId: string;
  readonly stream: "stdout" | "stderr";
  readonly text: string;
  readonly sequence: number;
}

export function createTauriClaudeCodeExecutor(): ClaudeCodeProcessExecutor {
  return async (command): Promise<ClaudeCodeProcessExecutionResult> => {
    const streamChannelId = readCommandSessionId(command.args);
    const result = await invoke<TauriClaudeCodeResponse>("run_claude_code_stream_json", {
      request: streamChannelId
        ? {
            ...command,
            streamChannelId
          }
        : command
    });

    return {
      stdout: result.stdout,
      stderr: result.stderr,
      exitCode: result.exitCode,
      stdoutTruncated: result.stdoutTruncated,
      stderrTruncated: result.stderrTruncated
    };
  };
}

export async function cancelTauriClaudeCodeStream(channelId: string): Promise<boolean> {
  return invoke<boolean>("cancel_claude_code_stream", { channelId });
}

function readCommandSessionId(args: readonly string[]): string | undefined {
  const index = args.indexOf("--session-id");
  const value = index >= 0 ? args[index + 1] : undefined;
  return value && value.trim().length > 0 ? value : undefined;
}
