import type { WorkbenchEvent } from "@geond-agent/backend-adapter-sdk";

import { CODEX_CLI_BACKEND_ID, createCodexCliBackendRegistryEntry } from "./capabilities.js";

export const CODEX_CLI_METADATA_FIXTURE_EVENTS: readonly WorkbenchEvent[] = [
  {
    type: "session.lifecycle",
    sessionId: "codex-cli-metadata-probe",
    lifecycle: "created",
    title: "Codex CLI metadata probe",
    selection: {
      backendAdapterId: CODEX_CLI_BACKEND_ID,
      routingMode: "manual",
      backendAdapter: createCodexCliBackendRegistryEntry(),
      capabilityWarnings: [
        "Codex CLI adapter is metadata-only; no process execution has been implemented."
      ]
    },
    at: "2026-06-25T00:00:00.000Z"
  },
  {
    type: "artifact.emitted",
    sessionId: "codex-cli-metadata-probe",
    artifact: {
      id: "codex-cli-adapter-checklist",
      kind: "report",
      title: "Codex adapter checklist",
      contentState: "metadata-only",
      summary: "Path-only placeholder for a future adapter validation report."
    },
    at: "2026-06-25T00:00:01.000Z"
  }
];
