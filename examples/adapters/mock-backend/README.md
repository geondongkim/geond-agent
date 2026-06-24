# Mock Backend Adapter Example

This example shows the smallest metadata shape a future backend adapter can
export to `geond-agent`.

It is intentionally not a real runner. It does not launch a process, call a
provider, read credentials, or store local session state. The purpose is to show
third-party adapter authors that the first contract is metadata and normalized
events from `@geond-agent/backend-adapter-sdk`.

## What It Demonstrates

- backend adapter id, label, and kind,
- per-capability support status,
- picker-ready backend option metadata,
- a tiny sanitized event stream fixture,
- no dependency on `@geond-agent/ui-workbench`.

## Usage Shape

```ts
import {
  MOCK_BACKEND_ADAPTER,
  MOCK_BACKEND_EVENTS,
  createMockBackendCatalog
} from "./mock-backend.js";

const catalog = createMockBackendCatalog();
const events = MOCK_BACKEND_EVENTS;
```

Real adapters should keep execution, credential lookup, process IO, and
tool-specific state inside their own package. They should emit SDK-shaped
events for the desktop workbench to persist and replay.
