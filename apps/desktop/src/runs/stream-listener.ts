import { listen } from "@tauri-apps/api/event";
import {
  createClaudeCodeStreamJsonNormalizer,
  redactSensitiveTextContent,
  redactWorkbenchEventsContent,
  type ClaudeCodeStreamJsonNormalizer
} from "@geond-agent/claude-code-bridge";
import { normalizeCodexCliJsonlRecords } from "@geond-agent/codex-cli-bridge";
import type { UiI18n, WorkbenchEvent } from "@geond-agent/ui-workbench";

import {
  CLAUDE_CODE_STREAM_EVENT,
  type TauriClaudeCodeStreamPayload
} from "../claude-runner.js";
import {
  CODEX_CLI_STREAM_EVENT,
  type TauriCodexCliStreamPayload
} from "../codex-runner.js";
import type { RunnerRequest } from "./types.js";

export async function listenToClaudeCodeStream(
  request: RunnerRequest,
  i18n: UiI18n,
  onEvents: (events: readonly WorkbenchEvent[]) => Promise<void>
): Promise<(() => void) | undefined> {
  try {
    const normalizer = createClaudeCodeStreamJsonNormalizer({
      fallbackSessionId: request.sessionId,
      workbenchSessionId: request.sessionId,
      resumedFromExternalSessionId: request.externalSessionId
    });

    return await listen<TauriClaudeCodeStreamPayload>(
      CLAUDE_CODE_STREAM_EVENT,
      (event) => {
        const events = createEventsFromStreamPayload(event.payload, request, i18n, normalizer);
        if (events.length > 0) {
          void onEvents(events);
        }
      }
    );
  } catch (error) {
    const warningTitle = i18n.t("workbench.liveWarning.listenerFailed");
    const warningDetail = error instanceof Error ? redactSensitiveTextContent(error.message) : "";
    try {
      await onEvents([
        {
          type: "warning",
          sessionId: request.sessionId,
          id: "claude-code-stream-listener-failed",
          message: warningDetail.length > 0 ? `${warningTitle} ${warningDetail}` : warningTitle,
          at: new Date().toISOString()
        }
      ]);
    } catch {
      // The listener is best-effort; failed warning persistence should not crash setup.
    }
    return undefined;
  }
}

export async function listenToCodexCliStream(
  request: RunnerRequest,
  i18n: UiI18n,
  onEvents: (events: readonly WorkbenchEvent[]) => Promise<void>
): Promise<(() => void) | undefined> {
  try {
    return await listen<TauriCodexCliStreamPayload>(
      CODEX_CLI_STREAM_EVENT,
      (event) => {
        const events = createEventsFromCodexStreamPayload(event.payload, request, i18n);
        if (events.length > 0) {
          void onEvents(events);
        }
      }
    );
  } catch (error) {
    const warningTitle = i18n.t("workbench.liveWarning.listenerFailed");
    const warningDetail = error instanceof Error ? redactSensitiveTextContent(error.message) : "";
    try {
      await onEvents([
        {
          type: "warning",
          sessionId: request.sessionId,
          id: "codex-cli-stream-listener-failed",
          message: warningDetail.length > 0 ? `${warningTitle} ${warningDetail}` : warningTitle,
          at: new Date().toISOString()
        }
      ]);
    } catch {
      // The listener is best-effort; failed warning persistence should not crash setup.
    }
    return undefined;
  }
}

export function createEventsFromStreamPayload(
  payload: TauriClaudeCodeStreamPayload,
  request: RunnerRequest,
  i18n: UiI18n,
  normalizer: ClaudeCodeStreamJsonNormalizer
): readonly WorkbenchEvent[] {
  if (!isClaudeStreamPayload(payload) || payload.channelId !== request.sessionId) {
    return [];
  }

  const at = new Date().toISOString();
  if (payload.stream === "stderr") {
    return redactWorkbenchEventsContent([
      {
        type: "command.output",
        sessionId: request.sessionId,
        commandId: "claude-code-stream-stderr",
        stream: "stderr",
        text: previewStreamText(payload.text),
        status: "running",
        at
      }
    ]);
  }

  try {
    const record = JSON.parse(payload.text) as unknown;
    return redactWorkbenchEventsContent(normalizer.accept(record).events);
  } catch (error) {
    return redactWorkbenchEventsContent([
      {
        type: "warning",
        sessionId: request.sessionId,
        id: `claude-code-stream-json-live-parse-${payload.sequence}`,
        message: error instanceof Error ? error.message : i18n.t("workbench.liveWarning.parseFailed"),
        at
      }
    ]);
  }
}

export function createEventsFromCodexStreamPayload(
  payload: TauriCodexCliStreamPayload,
  request: RunnerRequest,
  i18n: UiI18n
): readonly WorkbenchEvent[] {
  if (!isCodexStreamPayload(payload) || payload.channelId !== request.sessionId) {
    return [];
  }

  const at = new Date().toISOString();
  if (payload.stream === "stderr") {
    return redactWorkbenchEventsContent([
      {
        type: "command.output",
        sessionId: request.sessionId,
        commandId: "codex-cli-stream-stderr",
        stream: "stderr",
        text: previewStreamText(payload.text),
        status: "running",
        at
      }
    ]);
  }

  try {
    const record = JSON.parse(payload.text) as unknown;
    return redactWorkbenchEventsContent(
      normalizeCodexCliJsonlRecords([record], {
        fallbackSessionId: request.sessionId,
        workbenchSessionId: request.sessionId,
        resumedFromExternalSessionId: request.externalSessionId,
        title: request.title
      }).events
    );
  } catch (error) {
    return redactWorkbenchEventsContent([
      {
        type: "warning",
        sessionId: request.sessionId,
        id: `codex-cli-jsonl-live-parse-${payload.sequence}`,
        message: error instanceof Error ? error.message : i18n.t("workbench.liveWarning.parseFailed"),
        at
      }
    ]);
  }
}

function isClaudeStreamPayload(value: unknown): value is TauriClaudeCodeStreamPayload {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const record = value as Record<string, unknown>;
  return (
    typeof record.channelId === "string" &&
    (record.stream === "stdout" || record.stream === "stderr") &&
    typeof record.text === "string" &&
    typeof record.sequence === "number"
  );
}

function isCodexStreamPayload(value: unknown): value is TauriCodexCliStreamPayload {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const record = value as Record<string, unknown>;
  return (
    typeof record.channelId === "string" &&
    (record.stream === "stdout" || record.stream === "stderr") &&
    typeof record.text === "string" &&
    typeof record.sequence === "number"
  );
}

function previewStreamText(value: string): string {
  const trimmed = value.trim();
  return trimmed.length > 1200 ? `${trimmed.slice(0, 1200)}...` : trimmed;
}
