import type {
  CommandStatus,
  PlanItemStatus,
  WorkbenchEvent,
  WorkbenchSelectionSnapshot,
  WorkbenchToolCallStatus
} from "@geond-agent/backend-adapter-sdk";

import { CODEX_CLI_BACKEND_ID, createCodexCliBackendRegistryEntry } from "./capabilities.js";

export interface CodexCliJsonlNormalizeOptions {
  readonly fallbackSessionId: string;
  readonly workbenchSessionId?: string;
  readonly resumedFromExternalSessionId?: string;
  readonly title?: string;
  readonly selection?: WorkbenchSelectionSnapshot;
}

export interface CodexCliIgnoredJsonlRecord {
  readonly index: number;
  readonly type: string;
  readonly reason: string;
}

export interface CodexCliJsonlNormalizeResult {
  readonly events: readonly WorkbenchEvent[];
  readonly ignoredRecords: readonly CodexCliIgnoredJsonlRecord[];
}

export function normalizeCodexCliJsonlRecords(
  records: readonly unknown[],
  options: CodexCliJsonlNormalizeOptions
): CodexCliJsonlNormalizeResult {
  const events: WorkbenchEvent[] = [];
  const ignoredRecords: CodexCliIgnoredJsonlRecord[] = [];

  records.forEach((record, index) => {
    if (!isRecord(record)) {
      ignoredRecords.push({
        index,
        type: "non-object",
        reason: "Codex JSONL record is not an object."
      });
      return;
    }

    const mapped = mapCodexThreadEvent(record, index, options);
    if (mapped.length === 0) {
      ignoredRecords.push({
        index,
        type: asString(record.type) ?? "unknown",
        reason: "Codex JSONL record type is not mapped yet."
      });
      return;
    }

    events.push(...mapped);
  });

  return { events, ignoredRecords };
}

function mapCodexThreadEvent(
  record: Record<string, unknown>,
  index: number,
  options: CodexCliJsonlNormalizeOptions
): readonly WorkbenchEvent[] {
  const type = asString(record.type);
  const sessionId = options.workbenchSessionId ?? options.fallbackSessionId;
  const at = timestampFor(index);

  switch (type) {
    case "thread.started":
      return [
        {
          type: "session.lifecycle",
          sessionId,
          lifecycle: options.resumedFromExternalSessionId ? "resumed" : "started",
          title: options.title ?? asString(record.title) ?? "Codex CLI JSONL session",
          selection: options.selection ?? createDefaultCodexSelection(),
          at
        },
        {
          type: "session.adapter.linked",
          sessionId,
          adapterId: CODEX_CLI_BACKEND_ID,
          externalSessionId: asString(record.thread_id) ?? options.fallbackSessionId,
          resumedFromExternalSessionId: options.resumedFromExternalSessionId,
          at
        }
      ];
    case "turn.started":
      return [
        {
          type: "plan.updated",
          sessionId,
          items: [
            {
              id: "codex-turn",
              title: "Codex turn in progress",
              status: "in_progress"
            }
          ],
          at
        }
      ];
    case "turn.completed":
      return [
        {
          type: "usage.reported",
          sessionId,
          usage: {
            id: `codex-turn-usage-${index}`,
            source: "model",
            inputTokens: getUsageNumber(record.usage, "input_tokens"),
            cacheReadInputTokens: getUsageNumber(record.usage, "cached_input_tokens"),
            outputTokens: getUsageNumber(record.usage, "output_tokens"),
            reasoningTokens: getUsageNumber(record.usage, "reasoning_output_tokens")
          },
          at
        },
        {
          type: "session.lifecycle",
          sessionId,
          lifecycle: "completed",
          at
        }
      ];
    case "turn.failed":
      return [
        {
          type: "error",
          sessionId,
          id: `codex-turn-failed-${index}`,
          message: getErrorMessage(record.error) ?? "Codex turn failed.",
          at
        },
        {
          type: "session.lifecycle",
          sessionId,
          lifecycle: "failed",
          at
        }
      ];
    case "item.started":
    case "item.updated":
    case "item.completed":
      return mapCodexItemEvent(record, index, sessionId, at);
    case "error":
      return [
        {
          type: "error",
          sessionId,
          id: `codex-stream-error-${index}`,
          message: asString(record.message) ?? "Codex stream error.",
          at
        }
      ];
    default:
      return [];
  }
}

function mapCodexItemEvent(
  record: Record<string, unknown>,
  index: number,
  sessionId: string,
  at: string
): readonly WorkbenchEvent[] {
  const item = isRecord(record.item) ? record.item : undefined;
  if (!item) {
    return [];
  }

  const itemType = asString(item.type);
  const itemId = asString(item.id) ?? `codex-item-${index}`;

  switch (itemType) {
    case "agent_message":
      return [
        {
          type: "assistant.text.completed",
          sessionId,
          messageId: itemId,
          text: asString(item.text),
          at
        }
      ];
    case "reasoning":
      return [
        {
          type: "assistant.text.delta",
          sessionId,
          messageId: itemId,
          text: asString(item.text) ?? "",
          at
        }
      ];
    case "todo_list":
      return [
        {
          type: "plan.updated",
          sessionId,
          items: asArray(item.items).map((todo, todoIndex) => ({
            id: `${itemId}-${todoIndex + 1}`,
            title: asString(todo.text) ?? `Codex todo ${todoIndex + 1}`,
            status: todo.completed === true ? "completed" : "pending"
          })),
          at
        }
      ];
    case "command_execution":
      return [
        {
          type: "command.output",
          sessionId,
          commandId: itemId,
          stream: "status",
          text: asString(item.command) ?? "Codex command execution",
          status: normalizeCommandStatus(asString(item.status)),
          exitCode: asNumber(item.exit_code),
          at
        },
        ...(asString(item.aggregated_output)
          ? [
              {
                type: "command.output" as const,
                sessionId,
                commandId: itemId,
                stream: "stdout" as const,
                text: asString(item.aggregated_output) as string,
                status: normalizeCommandStatus(asString(item.status)),
                exitCode: asNumber(item.exit_code),
                at
              }
            ]
          : [])
      ];
    case "file_change":
      return [
        {
          type: "diff.emitted",
          sessionId,
          diff: {
            id: itemId,
            title: "Codex file change",
            summary: `Codex file change ${asString(item.status) ?? "completed"}.`,
            files: asArray(item.changes).map((change, changeIndex) => ({
              path: asString(change.path) ?? `codex-file-${changeIndex}`,
              changeKind: normalizePatchChangeKind(asString(change.kind))
            }))
          },
          at
        }
      ];
    case "mcp_tool_call":
      return [
        {
          type: "tool.call.started",
          sessionId,
          toolCall: {
            id: itemId,
            name: [asString(item.server), asString(item.tool)].filter(Boolean).join("/") || "mcp",
            status: normalizeToolStatus(asString(item.status)),
            inputSummary: summarizeJson(item.arguments),
            outputSummary: summarizeJson(item.result) ?? getErrorMessage(item.error)
          },
          at
        }
      ];
    case "web_search":
      return [
        {
          type: "tool.call.started",
          sessionId,
          toolCall: {
            id: itemId,
            name: "web_search",
            status: "succeeded",
            inputSummary: asString(item.query)
          },
          at
        }
      ];
    case "error":
      return [
        {
          type: "error",
          sessionId,
          id: itemId,
          message: asString(item.message) ?? "Codex item error.",
          at
        }
      ];
    default:
      return [];
  }
}

function createDefaultCodexSelection(): WorkbenchSelectionSnapshot {
  return {
    backendAdapterId: CODEX_CLI_BACKEND_ID,
    routingMode: "manual",
    backendAdapter: createCodexCliBackendRegistryEntry(),
    capabilityWarnings: [
      "Codex CLI JSONL events follow the upstream thread/item event model."
    ]
  };
}

function normalizeCommandStatus(value: string | undefined): CommandStatus {
  return value === "completed"
    ? "succeeded"
    : value === "failed"
      ? "failed"
      : "running";
}

function normalizeToolStatus(value: string | undefined): WorkbenchToolCallStatus {
  return value === "completed"
    ? "succeeded"
    : value === "failed"
      ? "failed"
      : "running";
}

function normalizePatchChangeKind(value: string | undefined) {
  return value === "add" ? "added" : value === "delete" ? "deleted" : "modified";
}

function getUsageNumber(value: unknown, key: string): number | undefined {
  return isRecord(value) ? asNumber(value[key]) : undefined;
}

function getErrorMessage(value: unknown): string | undefined {
  return isRecord(value) ? asString(value.message) : undefined;
}

function summarizeJson(value: unknown): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  try {
    const serialized = JSON.stringify(value);
    return serialized.length > 240 ? `${serialized.slice(0, 240)}...` : serialized;
  } catch {
    return undefined;
  }
}

function asArray(value: unknown): readonly Record<string, unknown>[] {
  return Array.isArray(value) ? value.filter(isRecord) : [];
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function asNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function timestampFor(offsetSeconds: number): string {
  return new Date(Date.UTC(2026, 5, 25, 0, 0, offsetSeconds)).toISOString();
}
