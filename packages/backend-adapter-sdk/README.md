# Backend Adapter SDK

Neutral backend adapter contracts for `geond-agent`.

This package is the source of truth for backend adapter metadata, capability
status, selection snapshots, registry helpers, and normalized workbench events.
It is intentionally framework-free so concrete adapter packages, the desktop
runner, and UI projections can share the same contract without making adapters
depend on `@geond-agent/ui-workbench`.

## Current Boundary

```ts
import {
  createBackendAdapterOptions,
  supportedCapability,
  type BackendAdapterMetadata
} from "@geond-agent/backend-adapter-sdk";

const adapter: BackendAdapterMetadata = {
  id: "example.external-cli",
  label: "Example external CLI",
  kind: "external-cli",
  capabilities: {
    sessions: supportedCapability(),
    resume: supportedCapability(),
    fork: supportedCapability(),
    toolCalls: supportedCapability(),
    terminalOutput: supportedCapability(),
    diffEvents: supportedCapability(),
    approvals: supportedCapability(),
    modelRouting: supportedCapability(),
    modelPicker: supportedCapability(),
    autoRouting: supportedCapability(),
    usageQuotaReporting: supportedCapability()
  }
};

const options = createBackendAdapterOptions({ backendAdapters: [adapter] });
```

The SDK does not execute tools, store secrets, call providers, or own UI state.
Adapters emit SDK-shaped metadata and events; the desktop app persists local
events; `@geond-agent/ui-workbench` re-exports these types for compatibility and
renders derived state.

## Non-Goals

- It is not `geond-agent-protocol`.
- It does not vendor Claude Code, Cline, OpenCode, Goose, or provider code.
- It does not store API keys, tokens, raw logs, screenshots, or local session
  state.
