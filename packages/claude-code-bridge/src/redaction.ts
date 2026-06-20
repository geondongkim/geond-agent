import type { ClaudeCodeAcpBoundary, ExternalCliBoundary } from "./boundary.js";

const SECRET_ENV_NAME_PATTERN = /(api[_-]?key|auth|password|secret|session|token)/i;
const REDACTED_ENV_VALUE = "[redacted]";

export function shouldRedactEnvName(name: string): boolean {
  return SECRET_ENV_NAME_PATTERN.test(name);
}

export function redactExternalCliBoundary(boundary: ExternalCliBoundary): ExternalCliBoundary {
  if (!boundary.env) {
    return boundary;
  }

  return {
    ...boundary,
    env: Object.fromEntries(
      Object.entries(boundary.env).map(([key, value]) => [
        key,
        value && shouldRedactEnvName(key) ? REDACTED_ENV_VALUE : value
      ])
    )
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
