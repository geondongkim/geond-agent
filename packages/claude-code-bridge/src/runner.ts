import type { WorkbenchEvent } from "@geond-agent/ui-workbench";

import type { ExternalCliBoundary } from "./boundary.js";
import { CLAUDE_CODE_SANITIZED_STREAM_JSON_FIXTURE } from "./stream-json.fixtures.js";
import {
  normalizeClaudeCodeStreamJsonRecords,
  type ClaudeCodeIgnoredStreamRecord
} from "./stream-json.js";

export type ClaudeCodePermissionMode = "plan" | "default" | "acceptEdits" | "bypassPermissions";

export interface ClaudeCodeStreamJsonCommandOptions {
  readonly executable?: string;
  readonly prompt: string;
  readonly cwd?: string;
  readonly modelAlias?: string;
  readonly permissionMode?: ClaudeCodePermissionMode;
  readonly sessionId?: string;
  readonly timeoutMs?: number;
}

export interface ClaudeCodeRunnerRequest extends ClaudeCodeStreamJsonCommandOptions {
  readonly sessionId: string;
  readonly title: string;
  readonly workspacePath?: string;
  readonly backendAdapterId?: string;
  readonly providerRouteId?: string;
  readonly modelProfileId?: string;
  readonly routingMode?: "manual" | "auto";
  readonly uiLanguage?: "en" | "ko";
  readonly agentResponseLanguage?: string;
}

export interface ClaudeCodeRunnerResult {
  readonly command: ExternalCliBoundary;
  readonly events: readonly WorkbenchEvent[];
  readonly ignoredRecords: readonly ClaudeCodeIgnoredStreamRecord[];
}

export interface ClaudeCodeProcessExecutionResult {
  readonly stdout: string;
  readonly stderr?: string;
  readonly exitCode?: number | null;
  readonly stdoutTruncated?: boolean;
  readonly stderrTruncated?: boolean;
}

export type ClaudeCodeProcessExecutor = (
  command: ExternalCliBoundary
) => Promise<ClaudeCodeProcessExecutionResult>;

export interface ClaudeCodeProcessRunnerResult extends ClaudeCodeRunnerResult {
  readonly parseErrors: readonly string[];
  readonly exitCode?: number | null;
  readonly stderrPreview?: string;
}

export interface ClaudeCodeProcessRunner {
  readonly id: "claude-code.process-stream-json";
  readonly label: string;
  readonly run: (request: ClaudeCodeRunnerRequest) => Promise<ClaudeCodeProcessRunnerResult>;
}

export interface ClaudeCodeFixtureReplayRunner {
  readonly id: "claude-code.fixture-replay";
  readonly label: string;
  readonly run: (request: ClaudeCodeRunnerRequest) => Promise<ClaudeCodeRunnerResult>;
}

export interface ClaudeCodeStreamJsonParseResult {
  readonly events: readonly WorkbenchEvent[];
  readonly ignoredRecords: readonly ClaudeCodeIgnoredStreamRecord[];
  readonly parseErrors: readonly string[];
}

export function buildClaudeCodeStreamJsonCommand(
  options: ClaudeCodeStreamJsonCommandOptions
): ExternalCliBoundary {
  return {
    executable: options.executable ?? "claude",
    cwd: options.cwd,
    timeoutMs: options.timeoutMs,
    args: [
      "--bare",
      "-p",
      "--verbose",
      "--output-format",
      "stream-json",
      "--model",
      options.modelAlias ?? "sonnet",
      "--permission-mode",
      options.permissionMode ?? "plan",
      ...(options.sessionId ? ["--session-id", options.sessionId] : []),
      options.prompt
    ]
  };
}

export function parseClaudeCodeStreamJsonLines(
  input: string,
  fallbackSessionId?: string
): ClaudeCodeStreamJsonParseResult {
  const parseErrors: string[] = [];
  const records = input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .flatMap((line, index) => {
      try {
        return [JSON.parse(line) as unknown];
      } catch (error) {
        parseErrors.push(`Line ${index + 1}: ${error instanceof Error ? error.message : "Invalid JSON"}`);
        return [];
      }
    });
  const normalized = normalizeClaudeCodeStreamJsonRecords(records, { fallbackSessionId });

  return {
    ...normalized,
    parseErrors
  };
}

export function createClaudeCodeFixtureReplayRunner(
  records: readonly unknown[] = CLAUDE_CODE_SANITIZED_STREAM_JSON_FIXTURE
): ClaudeCodeFixtureReplayRunner {
  return {
    id: "claude-code.fixture-replay",
    label: "Claude Code sanitized fixture replay",
    run: async (request) => {
      const preparedRecords = prepareFixtureRecords(records, request);
      const normalized = normalizeClaudeCodeStreamJsonRecords(preparedRecords, {
        fallbackSessionId: request.sessionId
      });

      return {
        command: buildClaudeCodeStreamJsonCommand(request),
        events: normalized.events,
        ignoredRecords: normalized.ignoredRecords
      };
    }
  };
}

export function createClaudeCodeProcessRunner(
  execute: ClaudeCodeProcessExecutor
): ClaudeCodeProcessRunner {
  return {
    id: "claude-code.process-stream-json",
    label: "Claude Code live stream-json process",
    run: async (request) => {
      const command = buildClaudeCodeStreamJsonCommand(request);
      const execution = await execute(command);
      const parsed = parseClaudeCodeStreamJsonLines(execution.stdout, request.sessionId);

      return {
        command,
        events: [
          ...parsed.events,
          ...createProcessDiagnosticEvents(request.sessionId, execution, parsed.parseErrors)
        ],
        ignoredRecords: parsed.ignoredRecords,
        parseErrors: parsed.parseErrors,
        exitCode: execution.exitCode,
        stderrPreview: previewText(execution.stderr)
      };
    }
  };
}

function prepareFixtureRecords(
  records: readonly unknown[],
  request: ClaudeCodeRunnerRequest
): readonly unknown[] {
  return records.map((record, index) => {
    if (!isRecord(record)) {
      return record;
    }

    return {
      ...record,
      session_id: request.sessionId,
      timestamp: timestampFor(index),
      cwd: request.workspacePath ?? record.cwd,
      title: record.type === "session.started" ? request.title : record.title,
      backend_id: request.backendAdapterId ?? record.backend_id,
      provider_route_id: request.providerRouteId ?? record.provider_route_id,
      model_profile_id: request.modelProfileId ?? request.modelAlias ?? record.model_profile_id,
      routing_mode: request.routingMode ?? record.routing_mode,
      ui_language: request.uiLanguage ?? record.ui_language,
      agent_language: request.agentResponseLanguage ?? record.agent_language
    };
  });
}

function timestampFor(offsetSeconds: number): string {
  return new Date(Date.UTC(2026, 5, 21, 3, 0, offsetSeconds)).toISOString();
}

function createProcessDiagnosticEvents(
  sessionId: string,
  execution: ClaudeCodeProcessExecutionResult,
  parseErrors: readonly string[]
): readonly WorkbenchEvent[] {
  const events: WorkbenchEvent[] = [];
  const stderrPreview = previewText(execution.stderr);

  if (execution.stdoutTruncated || execution.stderrTruncated) {
    events.push({
      type: "warning",
      sessionId,
      id: "claude-code-output-truncated",
      message: "Claude Code returned more diagnostic output than the local cap; streamed events were still processed."
    });
  }

  if (stderrPreview) {
    events.push({
      type: "command.output",
      sessionId,
      commandId: "claude-code",
      stream: "stderr",
      text: stderrPreview,
      status: execution.exitCode && execution.exitCode !== 0 ? "failed" : "succeeded"
    });
  }

  parseErrors.forEach((message, index) => {
    events.push({
      type: "warning",
      sessionId,
      id: `claude-code-stream-json-parse-${index + 1}`,
      message
    });
  });

  if (execution.exitCode && execution.exitCode !== 0) {
    events.push({
      type: "error",
      sessionId,
      id: "claude-code-process-exit",
      message: `Claude Code exited with status ${execution.exitCode}.`
    });
  }

  return events;
}

function previewText(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) {
    return undefined;
  }

  return trimmed.length > 2000 ? `${trimmed.slice(0, 2000)}...` : trimmed;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
