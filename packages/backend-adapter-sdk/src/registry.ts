import type {
  BackendAdapterMetadata,
  ModelProfileMetadata,
  ProviderRouteMetadata
} from "./selection.js";
import {
  createEmptyBackendAdapterCapabilities,
  unknownCapability
} from "./selection.js";

export interface BackendAdapterCatalog {
  readonly backendAdapters: readonly BackendAdapterMetadata[];
}

export interface WorkbenchSelectionCatalog extends BackendAdapterCatalog {
  readonly providerRoutes: readonly ProviderRouteMetadata[];
  readonly modelProfiles: readonly ModelProfileMetadata[];
}

export interface WorkbenchCatalogOption {
  readonly value: string;
  readonly label: string;
  readonly detail?: string;
}

export function createBackendAdapterCatalog(input: {
  readonly backendAdapters?: readonly BackendAdapterMetadata[];
} = {}): BackendAdapterCatalog {
  return {
    backendAdapters: input.backendAdapters ?? []
  };
}

export function createWorkbenchSelectionCatalog(input: {
  readonly backendAdapters?: readonly BackendAdapterMetadata[];
  readonly providerRoutes?: readonly ProviderRouteMetadata[];
  readonly modelProfiles?: readonly ModelProfileMetadata[];
} = {}): WorkbenchSelectionCatalog {
  return {
    backendAdapters: input.backendAdapters ?? [],
    providerRoutes: input.providerRoutes ?? [],
    modelProfiles: input.modelProfiles ?? []
  };
}

export function findBackendAdapter(
  catalog: BackendAdapterCatalog,
  id: string | undefined
): BackendAdapterMetadata | undefined {
  return id ? catalog.backendAdapters.find((entry) => entry.id === id) : undefined;
}

export function findProviderRoute(
  catalog: WorkbenchSelectionCatalog,
  id: string | undefined
): ProviderRouteMetadata | undefined {
  return id ? catalog.providerRoutes.find((entry) => entry.id === id) : undefined;
}

export function resolveModelProfile(
  catalog: WorkbenchSelectionCatalog,
  idOrAlias: string | undefined,
  providerRouteId?: string
): ModelProfileMetadata | undefined {
  if (!idOrAlias) {
    return undefined;
  }

  const exact = catalog.modelProfiles.find((entry) => entry.id === idOrAlias);
  if (exact) {
    return {
      ...exact,
      providerRouteId: providerRouteId ?? exact.providerRouteId
    };
  }

  const aliased = catalog.modelProfiles.find((entry) =>
    entry.aliases?.includes(idOrAlias)
  );
  if (!aliased) {
    return undefined;
  }

  return {
    ...aliased,
    id: idOrAlias,
    providerRouteId: providerRouteId ?? aliased.providerRouteId,
    label: `${idOrAlias} alias -> ${aliased.label}`,
    notes: [
      `Alias "${idOrAlias}" maps to ${aliased.id}.`,
      ...(aliased.notes ?? [])
    ]
  };
}

export function describeBackendAdapter(
  catalog: BackendAdapterCatalog,
  id: string
): BackendAdapterMetadata {
  return findBackendAdapter(catalog, id) ?? {
    id,
    label: id,
    kind: "external-cli",
    capabilities: createEmptyBackendAdapterCapabilities(),
    notes: ["Unknown backend adapter id; using metadata fallback."]
  };
}

export function describeProviderRoute(
  catalog: WorkbenchSelectionCatalog,
  id: string | undefined
): ProviderRouteMetadata | undefined {
  if (!id) {
    return undefined;
  }

  return findProviderRoute(catalog, id) ?? {
    id,
    providerId: "unknown",
    label: id,
    kind: "native-provider",
    hasApiKey: false,
    apiKeyState: "missing",
    notes: ["Unknown provider route id; using metadata fallback."]
  };
}

export function createBackendAdapterOptions(
  catalog: BackendAdapterCatalog
): readonly WorkbenchCatalogOption[] {
  return catalog.backendAdapters.map((entry) => ({
    value: entry.id,
    label: entry.label,
    detail: entry.kind
  }));
}

export function createProviderRouteOptions(
  catalog: WorkbenchSelectionCatalog
): readonly WorkbenchCatalogOption[] {
  return catalog.providerRoutes.map((entry) => ({
    value: entry.id,
    label: entry.label,
    detail: entry.kind
  }));
}

export function createModelProfileOptions(
  catalog: WorkbenchSelectionCatalog
): readonly WorkbenchCatalogOption[] {
  return catalog.modelProfiles.flatMap((entry) => {
    const aliases = entry.aliases?.length ? entry.aliases : [entry.id];

    return aliases.map((alias) => ({
      value: alias,
      label: alias === entry.id ? entry.label : `${alias} alias -> ${entry.label}`,
      detail: entry.capabilities.join(", ")
    }));
  });
}

export function createUnknownModelWarning(modelProfileId: string): string {
  return `Unknown model alias or profile id: ${modelProfileId}`;
}

export function createMissingProviderKeyWarning(route: ProviderRouteMetadata): string {
  return `${route.label} key presence is not stored in workbench events.`;
}

export function unknownModelAvailability() {
  return unknownCapability(
    "Availability depends on the installed tool and local provider key."
  );
}
