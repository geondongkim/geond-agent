import type { ClaudeCodeAcpBoundary, ExternalCliBoundary } from "./boundary.js";
import type { WorkbenchEvent } from "@geond-agent/backend-adapter-sdk";

const REDACTED_ENV_VALUE = "[redacted]";
const REDACTED_CONTENT_VALUE = "[redacted]";

const SECRET_ENV_NAME_PATTERN = /(?:key|token|secret|auth|password|session)/i;
const SECRET_ASSIGNMENT_PATTERN =
  /\b([A-Z0-9_-]*(?:API[_-]?KEY|TOKEN|SECRET|AUTH|PASSWORD|SESSION)[A-Z0-9_-]*)\s*[:=]\s*(?:"[^"]*"|'[^']*'|[^\s"'`]+)/gi;
const SECRET_TOKEN_VALUE_PATTERNS: readonly RegExp[] = [
  /\bsk-[A-Za-z0-9_-]{20,}\b/g,
  /\b[A-Za-z0-9+/]{56,}={0,2}\b/g
];

export function shouldRedactEnvName(name: string): boolean {
  if (typeof name !== "string" || name.length === 0) {
    return false;
  }
  return SECRET_ENV_NAME_PATTERN.test(name);
}

function redactEnvForDiagnostics(
  env: Readonly<Record<string, string | undefined>>
): Record<string, string | undefined> {
  const result: Record<string, string | undefined> = {};
  for (const [name, value] of Object.entries(env)) {
    result[name] = value && shouldRedactEnvName(name) ? REDACTED_ENV_VALUE : value;
  }
  return result;
}

export function redactExternalCliBoundary(boundary: ExternalCliBoundary): ExternalCliBoundary {
  if (!boundary.env) {
    return boundary;
  }

  return {
    ...boundary,
    env: redactEnvForDiagnostics(boundary.env)
  };
}

export function redactClaudeCodeAcpBoundary(
  boundary: ClaudeCodeAcpBoundary
): ClaudeCodeAcpBoundary {
  return {
    ...boundary,
    process: redactExternalCliBoundary(boundary.process)
  };
}

export function redactSensitiveTextContent(value: string): string {
  return SECRET_TOKEN_VALUE_PATTERNS.reduce(
    (text, pattern) => text.replace(pattern, REDACTED_CONTENT_VALUE),
    value.replace(SECRET_ASSIGNMENT_PATTERN, (_match, name: string) => {
      return `${name}=${REDACTED_CONTENT_VALUE}`;
    })
  );
}

export function redactWorkbenchEventContent(event: WorkbenchEvent): WorkbenchEvent {
  switch (event.type) {
    case "session.lifecycle":
      return {
        ...event,
        title: redactOptionalText(event.title),
        workspacePath: redactOptionalText(event.workspacePath)
      };
    case "context.attached":
      return {
        ...event,
        attachment: {
          ...event.attachment,
          title: redactSensitiveTextContent(event.attachment.title),
          path: redactOptionalText(event.attachment.path),
          summary: redactOptionalText(event.attachment.summary)
        }
      };
    case "assistant.text.delta":
      return {
        ...event,
        text: redactSensitiveTextContent(event.text)
      };
    case "assistant.text.completed":
      return {
        ...event,
        text: redactOptionalText(event.text)
      };
    case "plan.updated":
      return {
        ...event,
        items: event.items.map((item) => ({
          ...item,
          title: redactSensitiveTextContent(item.title)
        }))
      };
    case "tool.call.started":
      return {
        ...event,
        toolCall: {
          ...event.toolCall,
          inputSummary: redactOptionalText(event.toolCall.inputSummary),
          outputSummary: redactOptionalText(event.toolCall.outputSummary)
        }
      };
    case "tool.call.updated":
      return {
        ...event,
        outputSummary: redactOptionalText(event.outputSummary)
      };
    case "command.output":
      return {
        ...event,
        text: redactSensitiveTextContent(event.text)
      };
    case "diff.emitted":
      return {
        ...event,
        diff: {
          ...event.diff,
          title: redactOptionalText(event.diff.title),
          summary: redactOptionalText(event.diff.summary)
        }
      };
    case "usage.reported":
      return {
        ...event,
        usage: {
          ...event.usage,
          note: redactOptionalText(event.usage.note)
        }
      };
    case "run.attempt.started":
      return {
        ...event,
        attempt: {
          ...event.attempt,
          commandPreview: redactOptionalText(event.attempt.commandPreview),
          promptSummary: redactOptionalText(event.attempt.promptSummary),
          errorMessage: redactOptionalText(event.attempt.errorMessage)
        }
      };
    case "run.attempt.updated":
      return {
        ...event,
        errorMessage: redactOptionalText(event.errorMessage)
      };
    case "approval.requested":
      return {
        ...event,
        approval: {
          ...event.approval,
          title: redactSensitiveTextContent(event.approval.title),
          reason: redactOptionalText(event.approval.reason),
          subject: redactOptionalText(event.approval.subject)
        }
      };
    case "warning":
    case "error":
      return {
        ...event,
        message: redactSensitiveTextContent(event.message)
      };
    default:
      return event;
  }
}

export function redactWorkbenchEventsContent(
  events: readonly WorkbenchEvent[]
): readonly WorkbenchEvent[] {
  return events.map(redactWorkbenchEventContent);
}

function redactOptionalText(value: string | undefined): string | undefined {
  return value === undefined ? undefined : redactSensitiveTextContent(value);
}
