export type EvidenceCaptureKind = "screenshot" | "structured-trace";

export type EvidenceCaptureReadinessStatus =
  | "requires-explicit-consent"
  | "redaction-not-configured"
  | "ready-for-export";

export interface EvidenceCaptureReadiness {
  readonly kind: EvidenceCaptureKind;
  readonly title: string;
  readonly status: EvidenceCaptureReadinessStatus;
  readonly consentRequired: true;
  readonly consentGranted: boolean;
  readonly redactionRequired: true;
  readonly redactionConfigured: boolean;
  readonly capturedItemCount: number;
  readonly rawStoragePolicy: "never-store-raw-by-default";
}

export function createEvidenceCaptureReadiness({
  consentGranted = false,
  screenshotCount = 0,
  structuredTraceCount = 0,
  redactionConfigured = false
}: {
  readonly consentGranted?: boolean;
  readonly screenshotCount?: number;
  readonly structuredTraceCount?: number;
  readonly redactionConfigured?: boolean;
} = {}): readonly EvidenceCaptureReadiness[] {
  return [
    createReadinessItem({
      capturedItemCount: screenshotCount,
      consentGranted,
      kind: "screenshot",
      redactionConfigured,
      title: "Screenshot bundle"
    }),
    createReadinessItem({
      capturedItemCount: structuredTraceCount,
      consentGranted,
      kind: "structured-trace",
      redactionConfigured,
      title: "Structured trace bundle"
    })
  ];
}

export function formatEvidenceCaptureReadinessForManifest(
  items: readonly EvidenceCaptureReadiness[]
): readonly string[] {
  if (!items.length) {
    return ["- none"];
  }

  return items.map(
    (item) =>
      `- ${item.title}: ${item.status} | captured=${item.capturedItemCount} | consent=${item.consentGranted ? "granted" : "required"} | redaction=${item.redactionConfigured ? "configured" : "not-configured"} | raw=${item.rawStoragePolicy}`
  );
}

function createReadinessItem({
  capturedItemCount,
  consentGranted,
  kind,
  redactionConfigured,
  title
}: {
  readonly capturedItemCount: number;
  readonly consentGranted: boolean;
  readonly kind: EvidenceCaptureKind;
  readonly redactionConfigured: boolean;
  readonly title: string;
}): EvidenceCaptureReadiness {
  return {
    capturedItemCount: Math.max(0, Math.floor(capturedItemCount)),
    consentGranted,
    consentRequired: true,
    kind,
    rawStoragePolicy: "never-store-raw-by-default",
    redactionConfigured,
    redactionRequired: true,
    status: resolveReadinessStatus({ consentGranted, redactionConfigured }),
    title
  };
}

function resolveReadinessStatus({
  consentGranted,
  redactionConfigured
}: {
  readonly consentGranted: boolean;
  readonly redactionConfigured: boolean;
}): EvidenceCaptureReadinessStatus {
  if (!consentGranted) {
    return "requires-explicit-consent";
  }
  if (!redactionConfigured) {
    return "redaction-not-configured";
  }
  return "ready-for-export";
}
