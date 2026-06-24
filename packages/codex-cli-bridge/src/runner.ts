import type {
  ExecutionPolicyId,
  WorkbenchEvent
} from "@geond-agent/backend-adapter-sdk";

import type { ExternalCliBoundary } from "./boundary.js";
import { CODEX_CLI_BACKEND_ID } from "./capabilities.js";
import { CODEX_CLI_SANITIZED_JSONL_FIXTURE } from "./jsonl.fixtures.js";
import {
  normalizeCodexCliJsonlRecords,
  type CodexCliIgnoredJsonlRecord
} from "./jsonl.js";

export type CodexCliSandboxMode = "read-only" | "workspace-write" | "danger-full-access";
export type CodexCliApprovalPolicy = "untrusted" | "on-request" | "never";
export type CodexCliJsonOutputMode = "stable" | "experimental";

export interface CodexCliExecJsonCommandOptions {
  readonly executable?: string;
  readonly prompt: string;
  readonly cwd?: string;
  readonly modelAlias?: string;
  readonly executionPolicy?: ExecutionPolicyId;
  readonly sandboxMode?: CodexCliSandboxMode;
  readonly approvalPolicy?: CodexCliApprovalPolicy;
  readonly jsonOutputMode?: CodexCliJsonOutputMode;
  readonly profile?: string;
  readonly ephemeral?: boolean;
  readonly ignoreUserConfig?: boolean;
  readonly ignoreRules?: boolean;
  readonly externalSessionId?: string;
  readonly streamChannelId?: string;
  readonly timeoutMs?: number;
}

export interface CodexCliRunnerRequest extends CodexCliExecJsonCommandOptions {
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

export interface CodexCliRunnerResult {
  readonly command: ExternalCliBoundary;
  readonly events: readonly WorkbenchEvent[];
  readonly ignoredRecords: readonly CodexCliIgnoredJsonlRecord[];
}

export interface CodexCliProcessExecutionResult {
  readonly stdout: string;
  readonly stderr?: string;
  readonly exitCode?: number | null;
  readonly stdoutTruncated?: boolean;
  readonly stderrTruncated?: boolean;
}

export type CodexCliProcessExecutor = (
  command: ExternalCliBoundary
) => Promise<CodexCliProcessExecutionResult>;

export interface CodexCliProcessRunnerResult extends CodexCliRunnerResult {
  readonly parseErrors: readonly string[];
  readonly exitCode?: number | null;
  readonly stderrPreview?: string;
}

export interface CodexCliFixtureReplayRunner {
  readonly id: "codex-cli.fixture-replay";
  readonly label: string;
  readonly run: (request: CodexCliRunnerRequest) => Promise<CodexCliRunnerResult>;
}

export interface CodexCliProcessRunner {
  readonly id: "codex-cli.process-jsonl";
  readonly label: string;
  readonly run: (request: CodexCliRunnerRequest) => Promise<CodexCliProcessRunnerResult>;
}

export interface CodexCliJsonlParseResult {
  readonly events: readonly WorkbenchEvent[];
  readonly ignoredRecords: readonly CodexCliIgnoredJsonlRecord[];
  readonly parseErrors: readonly string[];
}

export function buildCodexCliExecJsonCommand(
  options: CodexCliExecJsonCommandOptions
): ExternalCliBoundary {
  const executionPolicy = options.executionPolicy ?? "plan";
  const sandboxMode =
    options.sandboxMode ?? mapExecutionPolicyToCodexSandboxMode(executionPolicy);
  const approvalPolicy =
    options.approvalPolicy ?? mapExecutionPolicyToCodexApprovalPolicy(executionPolicy);
  const jsonFlag = codexJsonFlagForMode(options.jsonOutputMode ?? "stable");

  return {
    executable: options.executable ?? "codex",
    cwd: options.cwd,
    stdin: options.prompt,
    timeoutMs: options.timeoutMs,
    streamChannelId: options.streamChannelId,
    args: [
      "exec",
      jsonFlag,
      "--sandbox",
      sandboxMode,
      "--config",
      `approval_policy="${approvalPolicy}"`,
      ...(options.ephemeral === false ? [] : ["--ephemeral"]),
      ...(options.ignoreUserConfig ? ["--ignore-user-config"] : []),
      ...(options.ignoreRules ? ["--ignore-rules"] : []),
      ...(options.cwd ? ["--cd", options.cwd] : []),
      ...(options.modelAlias ? ["--model", options.modelAlias] : []),
      ...(options.profile ? ["--profile", options.profile] : []),
      ...(executionPolicy === "bypass"
        ? ["--dangerously-bypass-approvals-and-sandbox"]
        : []),
      ...(options.externalSessionId ? ["resume", options.externalSessionId] : [])
    ]
  };
}

export function codexJsonFlagForMode(mode: CodexCliJsonOutputMode): "--json" | "--experimental-json" {
  return mode === "experimental" ? "--experimental-json" : "--json";
}

export function mapExecutionPolicyToCodexSandboxMode(
  policy: ExecutionPolicyId
): CodexCliSandboxMode {
  switch (policy) {
    case "plan":
      return "read-only";
    case "ask-first":
    case "accept-edits":
      return "workspace-write";
    case "bypass":
      return "danger-full-access";
  }
}

export function mapExecutionPolicyToCodexApprovalPolicy(
  policy: ExecutionPolicyId
): CodexCliApprovalPolicy {
  switch (policy) {
    case "plan":
    case "ask-first":
      return "untrusted";
    case "accept-edits":
      return "on-request";
    case "bypass":
      return "never";
  }
}

export function parseCodexCliJsonlLines(
  input: string,
  options: Parameters<typeof normalizeCodexCliJsonlRecords>[1]
): CodexCliJsonlParseResult {
  const parseErrors: string[] = [];
  const records = input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .flatMap((line, index) => {
      try {
        return [JSON.parse(line) as unknown];
      } catch (error) {
        parseErrors.push(
          `Line ${index + 1}: ${error instanceof Error ? error.message : "Invalid JSON"}`
        );
        return [];
      }
    });
  const normalized = normalizeCodexCliJsonlRecords(records, options);

  return {
    ...normalized,
    parseErrors
  };
}

export function createCodexCliFixtureReplayRunner(
  records: readonly unknown[] = CODEX_CLI_SANITIZED_JSONL_FIXTURE
): CodexCliFixtureReplayRunner {
  return {
    id: "codex-cli.fixture-replay",
    label: "Codex CLI sanitized JSONL fixture replay",
    run: async (request) => {
      const preparedRecords = prepareFixtureRecords(records, request);
      const normalized = normalizeCodexCliJsonlRecords(preparedRecords, {
        fallbackSessionId: request.sessionId,
        workbenchSessionId: request.sessionId,
        resumedFromExternalSessionId: request.externalSessionId,
        title: request.title
      });

      return {
        command: buildCodexCliExecJsonCommand({
          ...request,
          cwd: request.workspacePath ?? request.cwd,
          streamChannelId: request.sessionId
        }),
        events: normalized.events,
        ignoredRecords: normalized.ignoredRecords
      };
    }
  };
}

export function createCodexCliProcessRunner(
  execute: CodexCliProcessExecutor
): CodexCliProcessRunner {
  return {
    id: "codex-cli.process-jsonl",
    label: "Codex CLI live JSONL process",
    run: async (request) => {
      const command = buildCodexCliExecJsonCommand({
        ...request,
        cwd: request.workspacePath ?? request.cwd,
        streamChannelId: request.sessionId
      });
      const execution = await execute(command);
      const parsed = parseCodexCliJsonlLines(execution.stdout, {
        fallbackSessionId: request.sessionId,
        workbenchSessionId: request.sessionId,
        resumedFromExternalSessionId: request.externalSessionId,
        title: request.title
      });

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
  request: CodexCliRunnerRequest
): readonly unknown[] {
  return records.map((record, index) => {
    if (!isRecord(record)) {
      return record;
    }

    return {
      ...record,
      session_id: request.externalSessionId ?? request.sessionId,
      timestamp: timestampFor(index),
      cwd: request.workspacePath ?? request.cwd ?? record.cwd,
      title: record.type === "thread.started" ? request.title : record.title,
      model: request.modelProfileId ?? request.modelAlias ?? record.model,
      backend_id: request.backendAdapterId ?? CODEX_CLI_BACKEND_ID,
      provider_route_id: request.providerRouteId ?? record.provider_route_id,
      routing_mode: request.routingMode ?? record.routing_mode,
      ui_language: request.uiLanguage ?? record.ui_language,
      agent_language: request.agentResponseLanguage ?? record.agent_language
    };
  });
}

function createProcessDiagnosticEvents(
  sessionId: string,
  execution: CodexCliProcessExecutionResult,
  parseErrors: readonly string[]
): readonly WorkbenchEvent[] {
  const events: WorkbenchEvent[] = [];
  const stderrPreview = previewText(execution.stderr);

  if (execution.stdoutTruncated || execution.stderrTruncated) {
    events.push({
      type: "warning",
      sessionId,
      id: "codex-cli-output-truncated",
      message: "Codex CLI returned more diagnostic output than the local cap; JSONL events were still processed."
    });
  }

  if (stderrPreview) {
    events.push({
      type: "command.output",
      sessionId,
      commandId: "codex-cli",
      stream: "stderr",
      text: stderrPreview,
      status: execution.exitCode && execution.exitCode !== 0 ? "failed" : "succeeded"
    });
  }

  parseErrors.forEach((message, index) => {
    events.push({
      type: "warning",
      sessionId,
      id: `codex-cli-jsonl-parse-${index + 1}`,
      message
    });
  });

  if (execution.exitCode && execution.exitCode !== 0) {
    events.push({
      type: "error",
      sessionId,
      id: "codex-cli-process-exit",
      message: `Codex CLI exited with status ${execution.exitCode}.`
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

function timestampFor(offsetSeconds: number): string {
  return new Date(Date.UTC(2026, 5, 25, 1, 0, offsetSeconds)).toISOString();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
