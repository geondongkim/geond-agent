# Claude Code Bridge

Bridge package for Claude Code and ACP-compatible backend experiments.

## Responsibility

- Wrap Claude Code ACP execution.
- Track Goose session IDs and Claude Code session IDs.
- Experiment with list, resume, and fork behavior.
- Keep bridge-specific logic out of the desktop UI.

## Boundary

Claude Code is treated as an external user-installed tool. This package should
communicate through documented CLI, process, or protocol surfaces only.

Do not copy Claude Code internals or redistribute Claude Code binaries.

This package is a Claude Code adapter prototype. It is not the full
`geond-agent` backend abstraction and should not force the workbench UI to become
Claude Code-specific. Future adapter packages may target other ACP-compatible
backends, external CLI tools, IDE/plugin-mediated surfaces, or provider-routing
flows.

Backend adapter metadata, capabilities, selection snapshots, and normalized
workbench event types are imported from `@geond-agent/backend-adapter-sdk`. This
keeps the bridge pointed at the neutral adapter contract instead of depending on
`@geond-agent/ui-workbench`.

For the next implementation slices, Claude Code is the default route. That means
new adapter/event/session work should pave the Claude Code path first while
keeping the public workbench state adapter-neutral. OpenCode remains the next
horizontal-expansion candidate after this route stabilizes.

## Current API Boundary

```ts
import {
  defineClaudeCodeAcpBoundary,
  redactClaudeCodeAcpBoundary
} from "@geond-agent/claude-code-bridge";

const boundary = defineClaudeCodeAcpBoundary({
  executable: "claude",
  transport: "stdio"
});

const safeForLogs = redactClaudeCodeAcpBoundary(boundary);
```

The package models an external CLI/ACP boundary only. Execution, process
management, and ACP message handling stay behind this adapter package.

The current stream-json boundary accepts both older sanitized workbench-shaped
fixtures and real Claude Code `--bare -p --verbose --output-format stream-json`
envelopes such as `system/init`, `stream_event`, `assistant`, `user`, and
`result`. Committed fixtures are reduced and sanitized: they preserve event
shape, tool calls, text deltas, and usage metadata, but omit provider key
sources, raw logs, private transcripts, and machine-local paths.

Observed `result.permission_denials` arrays are normalized into pending
`approval.requested` workbench events. This gives the desktop UI a concrete
approval review queue for denied commands or filesystem edits. Interactive
approval forwarding back into a running Claude Code process is intentionally
deferred until a stable approval boundary is confirmed.

Fresh live runs use `--session-id <workbenchSessionId>`. Resumed live runs use
`--resume <externalSessionId>`, where the external id comes from a prior
`session.adapter.linked` event. The workbench session id remains the stream
channel and event-store owner, so Claude Code's conversation id never replaces
the local session id.

It also exposes adapter capability metadata for readiness checks:

```ts
import { createClaudeCodeAdapterMetadata } from "@geond-agent/claude-code-bridge";

const metadata = createClaudeCodeAdapterMetadata();
```

The metadata describes session, resume/fork, tool call, terminal output, diff,
approval, model metadata, model routing, and usage/quota reporting support as
supported, candidate, unknown, or unsupported. It is descriptive only and does
not execute Claude Code.

## Environment Redaction

`redactClaudeCodeAcpBoundary` returns a new boundary object whose `process.env`
is safe to write to logs. An env value is replaced with `[redacted]` when its
name is secret-like: case-insensitively containing `key`, `token`, `secret`,
`auth`, `password`, or `session`. This covers mixed-case names such as
`ApiKey` or `MySecret`, common provider aliases such as `ANTHROPIC_API_KEY`,
`ANTHROPIC_AUTH_TOKEN`, `OPENAI_KEY`, `AZURE_OPENAI_API_KEY`, `CLAUDE_CODE_OAUTH_TOKEN`,
`GITHUB_TOKEN`, `AWS_SECRET_ACCESS_KEY`, and `SESSION_ID`.

Non-secret values such as `PATH`, `HOME`, `NODE_ENV`, or `EDITOR` are left
visible so diagnostics stay useful. Empty and `undefined` values are preserved
as-is, which signals that a secret-named variable is unset without revealing any
real value.

Redaction is for logs and diagnostics only. It produces a fresh copy and never
mutates the boundary passed in, the bridge runtime config, or the real process
environment. The redaction helpers are pure and side-effect free.

```ts
import {
  defineClaudeCodeAcpBoundary,
  redactClaudeCodeAcpBoundary,
  shouldRedactEnvName
} from "@geond-agent/claude-code-bridge";

const boundary = defineClaudeCodeAcpBoundary({
  executable: "claude",
  transport: "stdio",
  env: {
    PATH: "/usr/bin",
    ANTHROPIC_AUTH_TOKEN: "<provider-secret-value>",
    NODE_ENV: "development"
  }
});

const safeForLogs = redactClaudeCodeAcpBoundary(boundary);
const redactedValue = safeForLogs.process.env["ANTHROPIC_AUTH_TOKEN"];
const visiblePath = safeForLogs.process.env.PATH;
const originalValue = boundary.process.env?.["ANTHROPIC_AUTH_TOKEN"];

// redactedValue is "[redacted]".
// visiblePath is "/usr/bin".
// originalValue is unchanged.

shouldRedactEnvName("OPENAI_KEY"); // true
shouldRedactEnvName("HOME");       // false
```

`redaction.fixtures.ts` contains callable fixture checks for the redaction
contract. They use synthetic values only and are safe to keep in tracked source.
