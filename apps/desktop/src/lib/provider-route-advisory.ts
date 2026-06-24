import type {
  WorkbenchCatalogOption,
  WorkbenchRunnerIssueSnapshot
} from "@geond-agent/ui-workbench";

const FALLBACK_WORTHY_ISSUES = new Set([
  "provider_overloaded",
  "provider_quota",
  "provider_timeout",
  "retry_exhausted"
]);

export function shouldOfferProviderRouteFallback(
  issue: WorkbenchRunnerIssueSnapshot
): boolean {
  return FALLBACK_WORTHY_ISSUES.has(issue.kind);
}

export function findAdvisoryProviderRouteFallback(input: {
  readonly issue: WorkbenchRunnerIssueSnapshot;
  readonly providerRouteOptions: readonly WorkbenchCatalogOption[];
}): WorkbenchCatalogOption | undefined {
  if (!shouldOfferProviderRouteFallback(input.issue)) {
    return undefined;
  }

  const unavailableRouteIds = new Set(
    [input.issue.providerRouteId].filter((value): value is string => Boolean(value))
  );
  const candidates = input.providerRouteOptions.filter(
    (route) => !unavailableRouteIds.has(route.value)
  );

  return (
    candidates.find((route) => route.detail === "openai-compatible") ??
    candidates[0]
  );
}

export function findCurrentProviderRouteOption(
  providerRouteOptions: readonly WorkbenchCatalogOption[],
  providerRouteId: string | undefined
): WorkbenchCatalogOption | undefined {
  return providerRouteId
    ? providerRouteOptions.find((route) => route.value === providerRouteId)
    : undefined;
}
