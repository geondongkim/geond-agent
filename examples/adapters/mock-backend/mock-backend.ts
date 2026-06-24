import {
  createBackendAdapterCatalog,
  supportedCapability,
  unavailableCapability,
  type BackendAdapterCatalog,
  type BackendAdapterMetadata,
  type WorkbenchEvent
} from "@geond-agent/backend-adapter-sdk";

export const MOCK_BACKEND_ADAPTER: BackendAdapterMetadata = {
  id: "mock.external-cli",
  label: "Mock external CLI",
  kind: "external-cli",
  capabilities: {
    sessions: supportedCapability(),
    resume: supportedCapability(),
    fork: unavailableCapability("The mock adapter is single-session only."),
    toolCalls: supportedCapability(),
    terminalOutput: supportedCapability(),
    diffEvents: supportedCapability(),
    approvals: supportedCapability(),
    modelRouting: supportedCapability(),
    modelPicker: supportedCapability(),
    autoRouting: unavailableCapability("Auto routing is intentionally deferred."),
    usageQuotaReporting: unavailableCapability("The mock adapter has no provider.")
  },
  notes: [
    "Educational fixture only; no process execution.",
    "No provider call, API key, raw log, or local session file is used."
  ]
};

export const MOCK_BACKEND_EVENTS: readonly WorkbenchEvent[] = [
  {
    type: "session.lifecycle",
    sessionId: "mock-session-1",
    lifecycle: "created",
    title: "Mock adapter smoke",
    selection: {
      backendAdapterId: MOCK_BACKEND_ADAPTER.id,
      routingMode: "manual",
      backendAdapter: MOCK_BACKEND_ADAPTER
    }
  },
  {
    type: "assistant.text.delta",
    sessionId: "mock-session-1",
    messageId: "mock-message-1",
    text: "Mock adapter emitted a normalized event."
  }
];

export function createMockBackendCatalog(): BackendAdapterCatalog {
  return createBackendAdapterCatalog({
    backendAdapters: [MOCK_BACKEND_ADAPTER]
  });
}
