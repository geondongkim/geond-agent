import type { ClaudeCodeAcpBoundary, ExternalCliBoundary } from "./boundary.js";

const REDACTED_ENV_VALUE = "[redacted]";

const SECRET_ENV_NAME_PATTERN = /(?:key|token|secret|auth|password|session)/i;

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
