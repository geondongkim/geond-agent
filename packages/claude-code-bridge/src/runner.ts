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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
