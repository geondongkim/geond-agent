import {
  type ExternalCliBoundary,
  defineClaudeCodeAcpBoundary
} from "./boundary.js";
import {
  redactClaudeCodeAcpBoundary,
  redactExternalCliBoundary,
  shouldRedactEnvName
} from "./redaction.js";

type AssertEqual<X, Y> =
  (<T>() => T extends X ? 1 : 2) extends (<T>() => T extends Y ? 1 : 2)
    ? true
    : false;

const EXPECTED_REDACTED_VALUE = "[redacted]" as const;
const FIXTURE_SENSITIVE_VALUE = "fixture-sensitive-value";

const _redactedValueContract: AssertEqual<
  typeof EXPECTED_REDACTED_VALUE,
  "[redacted]"
> = true;
void _redactedValueContract;

export const SECRET_ENV_NAME_FIXTURES = [
  "API_KEY",
  "ANTHROPIC_API_KEY",
  "ANTHROPIC_AUTH_TOKEN",
  "ZAI_API_KEY",
  "OPENAI_API_KEY",
  "CLAUDE_CODE_API_KEY",
  "PRIVATE_KEY",
  "ACCESS_KEY",
  "TOKEN",
  "ACCESS_TOKEN",
  "REFRESH_TOKEN",
  "GITHUB_TOKEN",
  "GLM_TOKEN",
  "CLAUDE_CODE_OAUTH_TOKEN",
  "SECRET",
  "CLIENT_SECRET",
  "JWT_SECRET",
  "AUTH",
  "AUTHORIZATION",
  "HTTP_PROXY_AUTH",
  "PASSWORD",
  "DB_PASSWORD",
  "PGPASSWORD",
  "SESSION",
  "SESSION_ID",
  "SESSION_TOKEN",
  "ApiKey",
  "anthropic_api_key",
  "Zai-Token",
  "My-Secret-Value",
  "Session-Id"
] as const;

export const NON_SECRET_ENV_NAME_FIXTURES = [
  "PATH",
  "HOME",
  "LANG",
  "LC_ALL",
  "EDITOR",
  "NODE_ENV",
  "SHELL",
  "USER",
  "TERM",
  "PWD",
  "PORT",
  "HOST",
  "COLOR",
  "DEBUG"
] as const;

export function verifySecretEnvNamesAreDetected(): void {
  for (const name of SECRET_ENV_NAME_FIXTURES) {
    if (!shouldRedactEnvName(name)) {
      throw new Error(`Secret-like env name was not detected: ${name}`);
    }
  }
}

export function verifyNonSecretEnvNamesStayVisible(): void {
  for (const name of NON_SECRET_ENV_NAME_FIXTURES) {
    if (shouldRedactEnvName(name)) {
      throw new Error(`Non-secret env name was flagged for redaction: ${name}`);
    }
  }
}

export function verifySecretValuesAreMaskedAndDiagnosticsStayVisible(): void {
  const env: Record<string, string | undefined> = {
    ANTHROPIC_API_KEY: FIXTURE_SENSITIVE_VALUE,
    ZAI_API_KEY: FIXTURE_SENSITIVE_VALUE,
    GITHUB_TOKEN: FIXTURE_SENSITIVE_VALUE,
    DB_PASSWORD: FIXTURE_SENSITIVE_VALUE,
    SESSION_ID: FIXTURE_SENSITIVE_VALUE,
    PRIVATE_KEY: FIXTURE_SENSITIVE_VALUE,
    PATH: "/usr/local/bin:/usr/bin",
    NODE_ENV: "test",
    USER: "agent"
  };
  const boundary: ExternalCliBoundary = {
    executable: "claude",
    args: [],
    env
  };
  const redacted = redactExternalCliBoundary(boundary);

  for (const name of Object.keys(env)) {
    if (shouldRedactEnvName(name)) {
      if (redacted.env?.[name] !== EXPECTED_REDACTED_VALUE) {
        throw new Error(`Secret value remained visible for ${name}`);
      }
      if (String(redacted.env?.[name] ?? "").includes(FIXTURE_SENSITIVE_VALUE)) {
        throw new Error(`Fixture sensitive value leaked for ${name}`);
      }
    }
  }

  if (redacted.env?.PATH !== env.PATH) {
    throw new Error("Non-secret PATH value was altered");
  }
  if (redacted.env?.NODE_ENV !== env.NODE_ENV) {
    throw new Error("Non-secret NODE_ENV value was altered");
  }
  if (redacted.env?.USER !== env.USER) {
    throw new Error("Non-secret USER value was altered");
  }
}

export function verifyUndefinedAndEmptyEnvValuesArePreserved(): void {
  const env: Record<string, string | undefined> = {
    ANTHROPIC_API_KEY: "",
    OPTIONAL_FLAG: undefined,
    SECRET_OPTION: undefined
  };
  const boundary: ExternalCliBoundary = {
    executable: "claude",
    args: [],
    env
  };
  const redacted = redactExternalCliBoundary(boundary);

  if (redacted.env?.ANTHROPIC_API_KEY !== "") {
    throw new Error("Empty secret-like value was not preserved as empty");
  }
  if (!Object.prototype.hasOwnProperty.call(redacted.env ?? {}, "OPTIONAL_FLAG")) {
    throw new Error("Undefined non-secret env entry was dropped");
  }
  if (redacted.env?.OPTIONAL_FLAG !== undefined) {
    throw new Error("Undefined non-secret env value was mutated");
  }
  if (!Object.prototype.hasOwnProperty.call(redacted.env ?? {}, "SECRET_OPTION")) {
    throw new Error("Undefined secret-like env entry was dropped");
  }
  if (redacted.env?.SECRET_OPTION !== undefined) {
    throw new Error("Undefined secret-like env value was mutated");
  }
}

export function verifyRedactionDoesNotMutateInput(): void {
  const env: Record<string, string | undefined> = {
    ANTHROPIC_API_KEY: FIXTURE_SENSITIVE_VALUE,
    PRIVATE_KEY: FIXTURE_SENSITIVE_VALUE,
    PATH: "/usr/bin"
  };
  const cliBoundary: ExternalCliBoundary = {
    executable: "claude",
    args: ["--acp"],
    env
  };
  const acpBoundary = defineClaudeCodeAcpBoundary({
    args: ["--acp"],
    env
  });
  const cliSnapshot = JSON.stringify(cliBoundary);
  const acpSnapshot = JSON.stringify(acpBoundary);

  const redactedCli = redactExternalCliBoundary(cliBoundary);
  const redactedAcp = redactClaudeCodeAcpBoundary(acpBoundary);

  if (JSON.stringify(cliBoundary) !== cliSnapshot) {
    throw new Error("redactExternalCliBoundary mutated its input boundary");
  }
  if (JSON.stringify(acpBoundary) !== acpSnapshot) {
    throw new Error("redactClaudeCodeAcpBoundary mutated its input boundary");
  }
  if (cliBoundary.env?.ANTHROPIC_API_KEY !== FIXTURE_SENSITIVE_VALUE) {
    throw new Error("redactExternalCliBoundary mutated the input env value");
  }
  if (acpBoundary.process.env?.ANTHROPIC_API_KEY !== FIXTURE_SENSITIVE_VALUE) {
    throw new Error("redactClaudeCodeAcpBoundary mutated the input env value");
  }
  if (redactedCli === cliBoundary) {
    throw new Error("redactExternalCliBoundary returned the same boundary reference");
  }
  if (redactedCli.env === cliBoundary.env) {
    throw new Error("redactExternalCliBoundary returned the same env reference");
  }
  if (redactedAcp === acpBoundary) {
    throw new Error("redactClaudeCodeAcpBoundary returned the same boundary reference");
  }
  if (redactedAcp.process.env === acpBoundary.process.env) {
    throw new Error("redactClaudeCodeAcpBoundary returned the same env reference");
  }
}

export function verifyBoundaryWithoutEnvIsHandled(): void {
  const boundary: ExternalCliBoundary = {
    executable: "claude",
    args: []
  };
  const redacted = redactExternalCliBoundary(boundary);
  if (Object.prototype.hasOwnProperty.call(redacted, "env")) {
    throw new Error("Redaction added an env field where none existed");
  }
}

export function verifyClaudeCodeRedactionFixtures(): void {
  verifySecretEnvNamesAreDetected();
  verifyNonSecretEnvNamesStayVisible();
  verifySecretValuesAreMaskedAndDiagnosticsStayVisible();
  verifyUndefinedAndEmptyEnvValuesArePreserved();
  verifyRedactionDoesNotMutateInput();
  verifyBoundaryWithoutEnvIsHandled();
}
