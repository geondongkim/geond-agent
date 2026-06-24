import type { WorkbenchEvent } from "@geond-agent/backend-adapter-sdk";

import {
  OPENCODE_BACKEND_ID,
  OPENCODE_HOST_AUTH_PROVIDER_ROUTE_ID,
  OPENCODE_MODEL_PROFILE_ID,
  createOpenCodeBackendRegistryEntry,
  createOpenCodeHostAuthProviderRoute,
  createOpenCodeSelectedModelProfile
} from "./capabilities.js";

export const OPENCODE_METADATA_FIXTURE_EVENTS: readonly WorkbenchEvent[] = [
  {
    type: "session.lifecycle",
    sessionId: "opencode-metadata-probe",
    lifecycle: "created",
    title: "OpenCode metadata probe",
    selection: {
      backendAdapterId: OPENCODE_BACKEND_ID,
      providerRouteId: OPENCODE_HOST_AUTH_PROVIDER_ROUTE_ID,
      modelProfileId: OPENCODE_MODEL_PROFILE_ID,
      modelVariantId: "opencode-plan",
      modeProfileId: "opencode-plan",
      reasoningMode: "provider-default",
      routingMode: "manual",
      backendAdapter: createOpenCodeBackendRegistryEntry(),
      providerRoute: createOpenCodeHostAuthProviderRoute(),
      modelProfile: createOpenCodeSelectedModelProfile(),
      capabilityWarnings: [
        "OpenCode adapter is metadata-only; no process execution has been implemented.",
        "Provider authentication is mediated by the installed host tool."
      ]
    },
    at: "2026-06-25T00:00:00.000Z"
  },
  {
    type: "diff.emitted",
    sessionId: "opencode-metadata-probe",
    diff: {
      id: "opencode-permission-diff",
      title: "Permission diff prompt placeholder",
      files: [
        {
          path: "packages/opencode-bridge/src/capabilities.ts",
          changeKind: "added",
          additions: 1,
          deletions: 0
        }
      ],
      summary: "Sanitized placeholder for future OpenCode diff event mapping."
    },
    at: "2026-06-25T00:00:01.000Z"
  },
  {
    type: "approval.requested",
    sessionId: "opencode-metadata-probe",
    approval: {
      id: "opencode-diff-approval",
      kind: "diff",
      title: "Review OpenCode diff",
      reason: "Future adapter should correlate permission prompts to normalized diff ids.",
      status: "pending",
      diffId: "opencode-permission-diff",
      requestedAt: "2026-06-25T00:00:02.000Z"
    },
    at: "2026-06-25T00:00:02.000Z"
  },
  {
    type: "artifact.emitted",
    sessionId: "opencode-metadata-probe",
    artifact: {
      id: "opencode-adapter-checklist",
      kind: "report",
      title: "OpenCode adapter checklist",
      contentState: "metadata-only",
      summary: "Path-only placeholder for future OpenCode validation evidence."
    },
    at: "2026-06-25T00:00:03.000Z"
  }
];
