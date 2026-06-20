export type BridgeSessionState = "starting" | "running" | "paused" | "exited" | "failed";

export interface ClaudeCodeSessionRef {
  readonly bridgeSessionId: string;
  readonly acpSessionId?: string;
  readonly claudeSessionId?: string;
  readonly workspacePath: string;
  readonly state: BridgeSessionState;
}

export interface SessionResumeRequest {
  readonly bridgeSessionId: string;
  readonly workspacePath: string;
  readonly acpSessionId?: string;
  readonly claudeSessionId?: string;
}

export function createBridgeSessionRef(
  request: SessionResumeRequest,
  state: BridgeSessionState = "starting"
): ClaudeCodeSessionRef {
  return {
    bridgeSessionId: request.bridgeSessionId,
    acpSessionId: request.acpSessionId,
    claudeSessionId: request.claudeSessionId,
    workspacePath: request.workspacePath,
    state
  };
}
