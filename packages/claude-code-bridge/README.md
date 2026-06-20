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
management, and ACP message handling will be added in later slices.
