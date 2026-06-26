import { invoke } from "@tauri-apps/api/core";
import type {
  CodexCliProcessExecutionResult,
  CodexCliProcessExecutor
} from "@geond-agent/codex-cli-bridge";

interface TauriCodexCliResponse {
  readonly stdout: string;
  readonly stderr: string;
  readonly exitCode?: number | null;
  readonly stdoutTruncated?: boolean;
  readonly stderrTruncated?: boolean;
}

interface TauriCodexCliProbeResponse {
  readonly available: boolean;
  readonly executable: string;
  readonly version?: string | null;
  readonly error?: string | null;
}

export const CODEX_CLI_STREAM_EVENT = "geond-agent://codex-cli-jsonl";

export type CodexCliProbeState = "available" | "missing" | "unknown";

export interface CodexCliProbe {
  readonly state: CodexCliProbeState;
  readonly executable: string;
  readonly version?: string;
  readonly detail: string;
}

export interface TauriCodexCliStreamPayload {
  readonly channelId: string;
  readonly stream: "stdout" | "stderr";
  readonly text: string;
  readonly sequence: number;
}

export function createTauriCodexCliExecutor(): CodexCliProcessExecutor {
  return async (command): Promise<CodexCliProcessExecutionResult> => {
    const result = await invoke<TauriCodexCliResponse>("run_codex_cli_jsonl", {
      request: command
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

export async function cancelTauriCodexCliStream(channelId: string): Promise<boolean> {
  return invoke<boolean>("cancel_codex_cli_stream", { channelId });
}

export async function probeTauriCodexCliExecutable(): Promise<CodexCliProbe> {
  try {
    const result = await invoke<TauriCodexCliProbeResponse>("probe_codex_cli_executable", {
      request: { executable: "codex" }
    });

    return {
      state: result.available ? "available" : "missing",
      executable: result.executable,
      version: result.version ?? undefined,
      detail: result.available
        ? result.version
          ? `codex ${result.version}`
          : "Codex CLI is available."
        : result.error ?? "Codex CLI was not found on PATH."
    };
  } catch (error) {
    return {
      state: "unknown",
      executable: "codex",
      detail: error instanceof Error ? error.message : "Codex CLI probe is unavailable."
    };
  }
}
