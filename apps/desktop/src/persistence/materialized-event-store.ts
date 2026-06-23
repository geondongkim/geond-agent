import { invoke } from "@tauri-apps/api/core";

export type JsonValue =
  | null
  | boolean
  | number
  | string
  | readonly JsonValue[]
  | { readonly [key: string]: JsonValue };

export interface WorkbenchContextAttachmentRecord {
  readonly sessionId: string;
  readonly attachmentId: string;
  readonly kind: string;
  readonly title: string;
  readonly provenance: string;
  readonly contentState: string;
  readonly path?: string;
  readonly language?: string;
  readonly range?: JsonValue;
  readonly summary?: string;
  readonly attachedAt?: string;
  readonly sourceEventId?: number;
  readonly updatedAt?: string;
}

export interface WorkbenchToolCallRecord {
  readonly sessionId: string;
  readonly toolCallId: string;
  readonly name: string;
  readonly status: string;
  readonly inputSummary?: string;
  readonly outputSummary?: string;
  readonly sourceEventId?: number;
  readonly updatedAt?: string;
}

export interface WorkbenchCommandOutputRecord {
  readonly sessionId: string;
  readonly commandId: string;
  readonly status: string;
  readonly exitCode?: number;
  readonly chunkCount: number;
  readonly stdoutPreview?: string;
  readonly stderrPreview?: string;
  readonly sourceEventId?: number;
  readonly updatedAt?: string;
}

export interface WorkbenchDiffSummaryRecord {
  readonly sessionId: string;
  readonly diffId: string;
  readonly title?: string;
  readonly fileCount: number;
  readonly additions: number;
  readonly deletions: number;
  readonly summary?: string;
  readonly files: JsonValue;
  readonly sourceEventId?: number;
  readonly updatedAt?: string;
}

export interface WorkbenchUsageMetadataRecord {
  readonly sessionId: string;
  readonly usageId: string;
  readonly source: string;
  readonly model?: string;
  readonly inputTokens?: number;
  readonly outputTokens?: number;
  readonly cacheCreationInputTokens?: number;
  readonly cacheReadInputTokens?: number;
  readonly contextWindow?: number;
  readonly maxOutputTokens?: number;
  readonly costUsd?: number;
  readonly serviceTier?: string;
  readonly note?: string;
  readonly sourceEventId?: number;
  readonly updatedAt?: string;
}

export interface WorkbenchRunAttemptRecord {
  readonly sessionId: string;
  readonly attemptId: string;
  readonly mode: string;
  readonly status: string;
  readonly backendAdapterId?: string;
  readonly providerRouteId?: string;
  readonly modelProfileId?: string;
  readonly routingMode?: string;
  readonly permissionMode?: string;
  readonly externalSessionId?: string;
  readonly resumedFromExternalSessionId?: string;
  readonly commandPreview?: string;
  readonly promptSummary?: string;
  readonly startedAt?: string;
  readonly finishedAt?: string;
  readonly exitCode?: number;
  readonly eventCount?: number;
  readonly ignoredRecordCount?: number;
  readonly parseWarningCount?: number;
  readonly errorMessage?: string;
  readonly sourceEventId?: number;
  readonly updatedAt?: string;
}

export interface DesktopMaterializedEventStore {
  readonly driver: "tauri-sqlite" | "memory-fallback";
  readonly listContextAttachments: (
    sessionId?: string
  ) => Promise<readonly WorkbenchContextAttachmentRecord[]>;
  readonly listToolCalls: (sessionId?: string) => Promise<readonly WorkbenchToolCallRecord[]>;
  readonly listCommandOutputs: (
    sessionId?: string
  ) => Promise<readonly WorkbenchCommandOutputRecord[]>;
  readonly listDiffSummaries: (
    sessionId?: string
  ) => Promise<readonly WorkbenchDiffSummaryRecord[]>;
  readonly listUsageMetadata: (
    sessionId?: string
  ) => Promise<readonly WorkbenchUsageMetadataRecord[]>;
  readonly listRunAttempts: (sessionId?: string) => Promise<readonly WorkbenchRunAttemptRecord[]>;
}

export interface DesktopMaterializedEventSeed {
  readonly contextAttachments?: readonly WorkbenchContextAttachmentRecord[];
  readonly toolCalls?: readonly WorkbenchToolCallRecord[];
  readonly commandOutputs?: readonly WorkbenchCommandOutputRecord[];
  readonly diffSummaries?: readonly WorkbenchDiffSummaryRecord[];
  readonly usageMetadata?: readonly WorkbenchUsageMetadataRecord[];
  readonly runAttempts?: readonly WorkbenchRunAttemptRecord[];
}

export function createDesktopMaterializedEventStore(
  fallback: DesktopMaterializedEventStore = createMemoryMaterializedEventStore()
): DesktopMaterializedEventStore {
  return {
    driver: "tauri-sqlite",
    listContextAttachments: async (sessionId) =>
      invokeList("list_workbench_context_attachments", sessionId, fallback.listContextAttachments),
    listToolCalls: async (sessionId) =>
      invokeList("list_workbench_tool_calls", sessionId, fallback.listToolCalls),
    listCommandOutputs: async (sessionId) =>
      invokeList("list_workbench_command_outputs", sessionId, fallback.listCommandOutputs),
    listDiffSummaries: async (sessionId) =>
      invokeList("list_workbench_diff_summaries", sessionId, fallback.listDiffSummaries),
    listUsageMetadata: async (sessionId) =>
      invokeList("list_workbench_usage_metadata", sessionId, fallback.listUsageMetadata),
    listRunAttempts: async (sessionId) =>
      invokeList("list_workbench_run_attempts", sessionId, fallback.listRunAttempts)
  };
}

export function createMemoryMaterializedEventStore(
  seed: DesktopMaterializedEventSeed = {}
): DesktopMaterializedEventStore {
  const contextAttachments = [...(seed.contextAttachments ?? [])];
  const toolCalls = [...(seed.toolCalls ?? [])];
  const commandOutputs = [...(seed.commandOutputs ?? [])];
  const diffSummaries = [...(seed.diffSummaries ?? [])];
  const usageMetadata = [...(seed.usageMetadata ?? [])];
  const runAttempts = [...(seed.runAttempts ?? [])];

  return {
    driver: "memory-fallback",
    listContextAttachments: async (sessionId) => filterSession(contextAttachments, sessionId),
    listToolCalls: async (sessionId) => filterSession(toolCalls, sessionId),
    listCommandOutputs: async (sessionId) => filterSession(commandOutputs, sessionId),
    listDiffSummaries: async (sessionId) => filterSession(diffSummaries, sessionId),
    listUsageMetadata: async (sessionId) => filterSession(usageMetadata, sessionId),
    listRunAttempts: async (sessionId) => filterSession(runAttempts, sessionId)
  };
}

async function invokeList<T>(
  command: string,
  sessionId: string | undefined,
  fallback: (sessionId?: string) => Promise<readonly T[]>
): Promise<readonly T[]> {
  try {
    return await invoke<T[]>(command, { sessionId });
  } catch {
    return fallback(sessionId);
  }
}

function filterSession<T extends { readonly sessionId: string }>(
  records: readonly T[],
  sessionId: string | undefined
): readonly T[] {
  return sessionId ? records.filter((record) => record.sessionId === sessionId) : [...records];
}
