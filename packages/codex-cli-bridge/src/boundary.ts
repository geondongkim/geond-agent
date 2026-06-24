export interface ExternalCliBoundary {
  readonly executable: string;
  readonly args: readonly string[];
  readonly stdin?: string;
  readonly cwd?: string;
  readonly env?: Readonly<Record<string, string | undefined>>;
  readonly timeoutMs?: number;
  readonly streamChannelId?: string;
}

export interface CodexCliBoundaryOptions {
  readonly executable?: string;
  readonly args?: readonly string[];
  readonly stdin?: string;
  readonly cwd?: string;
  readonly env?: Readonly<Record<string, string | undefined>>;
  readonly timeoutMs?: number;
  readonly streamChannelId?: string;
}

export function defineCodexCliBoundary(
  options: CodexCliBoundaryOptions = {}
): ExternalCliBoundary {
  return {
    executable: options.executable ?? "codex",
    args: options.args ?? [],
    stdin: options.stdin,
    cwd: options.cwd,
    env: options.env,
    timeoutMs: options.timeoutMs,
    streamChannelId: options.streamChannelId
  };
}
