export type AcpTransport = "stdio" | "socket";

export interface ExternalCliBoundary {
  readonly executable: string;
  readonly args: readonly string[];
  readonly cwd?: string;
  readonly env?: Readonly<Record<string, string | undefined>>;
  readonly timeoutMs?: number;
  readonly streamChannelId?: string;
}

export interface ClaudeCodeAcpBoundary {
  readonly kind: "external-cli-acp";
  readonly transport: AcpTransport;
  readonly process: ExternalCliBoundary;
  readonly bundlesClaudeCode: false;
}

export interface ClaudeCodeAcpBoundaryOptions {
  readonly executable?: string;
  readonly args?: readonly string[];
  readonly cwd?: string;
  readonly env?: Readonly<Record<string, string | undefined>>;
  readonly transport?: AcpTransport;
}

export function defineClaudeCodeAcpBoundary(
  options: ClaudeCodeAcpBoundaryOptions = {}
): ClaudeCodeAcpBoundary {
  return {
    kind: "external-cli-acp",
    transport: options.transport ?? "stdio",
    process: {
      executable: options.executable ?? "claude",
      args: options.args ?? [],
      cwd: options.cwd,
      env: options.env
    },
    bundlesClaudeCode: false
  };
}
