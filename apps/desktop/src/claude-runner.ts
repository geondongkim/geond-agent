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

interface TauriClaudeCodeProbeResponse {
  readonly available: boolean;
  readonly executable: string;
  readonly version?: string | null;
  readonly error?: string | null;
}

export const CLAUDE_CODE_STREAM_EVENT = "geond-agent://claude-code-stream-json";

export type ClaudeCodeCliProbeState = "available" | "missing" | "unknown";

export interface ClaudeCodeCliProbe {
  readonly state: ClaudeCodeCliProbeState;
  readonly executable: string;
  readonly version?: string;
  readonly detail: string;
}

export interface TauriClaudeCodeStreamPayload {
  readonly channelId: string;
  readonly stream: "stdout" | "stderr";
  readonly text: string;
  readonly sequence: number;
}

export function createTauriClaudeCodeExecutor(): ClaudeCodeProcessExecutor {
  return async (command): Promise<ClaudeCodeProcessExecutionResult> => {
    const streamChannelId = command.streamChannelId ?? readCommandSessionId(command.args);
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

export async function probeTauriClaudeCodeExecutable(): Promise<ClaudeCodeCliProbe> {
  try {
    const result = await invoke<TauriClaudeCodeProbeResponse>("probe_claude_code_executable", {
      request: { executable: "claude" }
    });

    return {
      state: result.available ? "available" : "missing",
      executable: result.executable,
      version: result.version ?? undefined,
      detail: result.available
        ? result.version
          ? `claude ${result.version}`
          : "Claude Code CLI is available."
        : result.error ?? "Claude Code CLI was not found on PATH."
    };
  } catch (error) {
    return {
      state: "unknown",
      executable: "claude",
      detail: error instanceof Error ? error.message : "Claude Code CLI probe is unavailable."
    };
  }
}

function readCommandSessionId(args: readonly string[]): string | undefined {
  const index = args.indexOf("--session-id");
  const value = index >= 0 ? args[index + 1] : undefined;
  return value && value.trim().length > 0 ? value : undefined;
}
