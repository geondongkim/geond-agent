import type { LocalSettingsStore } from "@geond-agent/ui-workbench";
import { redactSensitiveTextContent } from "@geond-agent/claude-code-bridge";

export const RECENT_CONTEXT_SETTINGS_KEY = "geond-agent.workbench.recent-context";

const MAX_RECENT_CONTEXT_ITEMS = 8;
const MAX_TEXT_LENGTH = 240;

export type RecentContextKind = "workspace" | "file";

export interface RecentContextItem {
  readonly id: string;
  readonly kind: RecentContextKind;
  readonly label: string;
  readonly path: string;
  readonly updatedAt: string;
  readonly favorite: boolean;
}

export interface RecentContextWorkspaceGroup {
  readonly id: string;
  readonly label: string;
  readonly path: string;
  readonly items: readonly RecentContextItem[];
  readonly favoriteCount: number;
  readonly updatedAt: string;
}

export async function loadRecentContextItems(
  settingsStore: LocalSettingsStore
): Promise<readonly RecentContextItem[]> {
  const saved = await settingsStore.getItem(RECENT_CONTEXT_SETTINGS_KEY);
  if (!saved) {
    return [];
  }

  try {
    return normalizeRecentContextItems(JSON.parse(saved));
  } catch {
    return [];
  }
}

export async function saveRecentContextItems(
  settingsStore: LocalSettingsStore,
  items: readonly RecentContextItem[]
): Promise<readonly RecentContextItem[]> {
  const normalized = normalizeRecentContextItems(items);
  await settingsStore.setItem(RECENT_CONTEXT_SETTINGS_KEY, JSON.stringify(normalized));
  return normalized;
}

export function createRecentContextItem({
  kind,
  label,
  path,
  updatedAt = new Date().toISOString()
}: {
  readonly kind: RecentContextKind;
  readonly label?: string;
  readonly path: string;
  readonly updatedAt?: string;
}): RecentContextItem | undefined {
  const normalizedPath = normalizeText(path, 1024);
  if (!normalizedPath) {
    return undefined;
  }

  const normalizedKind: RecentContextKind = kind === "file" ? "file" : "workspace";
  const normalizedLabel = normalizeText(label, MAX_TEXT_LENGTH) ?? basename(normalizedPath);

  return {
    id: `${normalizedKind}:${stablePathSuffix(normalizedPath)}`,
    kind: normalizedKind,
    label: normalizedLabel,
    path: normalizedPath,
    updatedAt: normalizeText(updatedAt, 64) ?? new Date().toISOString(),
    favorite: false
  };
}

export function mergeRecentContextItem(
  current: readonly RecentContextItem[],
  item: RecentContextItem | undefined
): readonly RecentContextItem[] {
  if (!item) {
    return normalizeRecentContextItems(current);
  }

  const existing = current.find(
    (entry) => entry.kind === item.kind && entry.path === item.path
  );

  return normalizeRecentContextItems([
    {
      ...item,
      favorite: item.favorite || existing?.favorite === true
    },
    ...current.filter((entry) => entry.kind !== item.kind || entry.path !== item.path)
  ]);
}

export function toggleRecentContextItemFavorite(
  current: readonly RecentContextItem[],
  itemId: string
): readonly RecentContextItem[] {
  return normalizeRecentContextItems(
    current.map((item) =>
      item.id === itemId
        ? {
            ...item,
            favorite: !item.favorite
          }
        : item
    )
  );
}

export function toggleRecentContextPathFavorite(
  current: readonly RecentContextItem[],
  options: {
    readonly kind: RecentContextKind;
    readonly label?: string;
    readonly path: string;
    readonly updatedAt?: string;
  }
): readonly RecentContextItem[] {
  const normalizedPath = normalizeText(options.path, 1024);
  if (!normalizedPath) {
    return normalizeRecentContextItems(current);
  }

  const existing = current.find(
    (item) => item.kind === options.kind && item.path === normalizedPath
  );
  if (existing) {
    return toggleRecentContextItemFavorite(current, existing.id);
  }

  const item = createRecentContextItem({
    kind: options.kind,
    label: options.label,
    path: normalizedPath,
    updatedAt: options.updatedAt
  });

  return normalizeRecentContextItems([
    ...(item ? [{ ...item, favorite: true }] : []),
    ...current
  ]);
}

export function groupRecentContextByWorkspace(
  items: readonly RecentContextItem[],
  workspaceHints: readonly RecentContextItem[] = items
): readonly RecentContextWorkspaceGroup[] {
  const workspaceCandidates = workspaceHints
    .filter((item) => item.kind === "workspace")
    .sort((left, right) => right.path.length - left.path.length);
  const groups = new Map<string, RecentContextWorkspaceGroup>();

  for (const item of items) {
    const workspace = resolveWorkspaceForRecentContextItem(item, workspaceCandidates);
    const existing = groups.get(workspace.path);
    const nextItems = [...(existing?.items ?? []), item].sort((left, right) =>
      right.updatedAt.localeCompare(left.updatedAt)
    );
    groups.set(workspace.path, {
      id: `workspace-group:${stablePathSuffix(workspace.path)}`,
      label: workspace.label,
      path: workspace.path,
      items: nextItems,
      favoriteCount: nextItems.filter((candidate) => candidate.favorite).length,
      updatedAt: nextItems[0]?.updatedAt ?? item.updatedAt
    });
  }

  return [...groups.values()].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

export function normalizeRecentContextItems(value: unknown): readonly RecentContextItem[] {
  const entries = Array.isArray(value)
    ? value
    : isRecord(value) && Array.isArray(value.items)
      ? value.items
      : [];

  return entries
    .flatMap((entry) => normalizeRecentContextItem(entry))
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
    .filter((entry, index, values) =>
      values.findIndex((candidate) => candidate.kind === entry.kind && candidate.path === entry.path) ===
      index
    )
    .slice(0, MAX_RECENT_CONTEXT_ITEMS);
}

function normalizeRecentContextItem(value: unknown): readonly RecentContextItem[] {
  if (!isRecord(value)) {
    return [];
  }

  const kind = value.kind === "file" ? "file" : value.kind === "workspace" ? "workspace" : undefined;
  const path = normalizeText(value.path, 1024);
  if (!kind || !path) {
    return [];
  }

  const label = normalizeText(value.label, MAX_TEXT_LENGTH) ?? basename(path);
  const updatedAt = normalizeText(value.updatedAt, 64) ?? new Date(0).toISOString();

  return [
    {
      id: normalizeText(value.id, MAX_TEXT_LENGTH) ?? `${kind}:${stablePathSuffix(path)}`,
      kind,
      label,
      path,
      updatedAt,
      favorite: value.favorite === true
    }
  ];
}

function resolveWorkspaceForRecentContextItem(
  item: RecentContextItem,
  workspaceCandidates: readonly RecentContextItem[]
): { readonly label: string; readonly path: string } {
  if (item.kind === "workspace") {
    return {
      label: item.label,
      path: item.path
    };
  }

  const matchingWorkspace = workspaceCandidates.find((workspace) =>
    isPathInsideWorkspace(item.path, workspace.path)
  );
  if (matchingWorkspace) {
    return {
      label: matchingWorkspace.label,
      path: matchingWorkspace.path
    };
  }

  const path = dirname(item.path);
  return {
    label: basename(path),
    path
  };
}

function isPathInsideWorkspace(path: string, workspacePath: string): boolean {
  return path === workspacePath || path.startsWith(`${workspacePath.replace(/\/+$/g, "")}/`);
}

function normalizeText(value: unknown, maxLength: number): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = redactSensitiveTextContent(value).trim();
  return trimmed.length > 0 ? trimmed.slice(0, maxLength) : undefined;
}

function basename(path: string): string {
  const pieces = path.split("/").filter((piece) => piece.length > 0);
  return pieces[pieces.length - 1] ?? path;
}

function dirname(path: string): string {
  const normalizedPath = path.replace(/\/+$/g, "");
  const lastSlashIndex = normalizedPath.lastIndexOf("/");
  if (lastSlashIndex <= 0) {
    return normalizedPath || "/";
  }
  return normalizedPath.slice(0, lastSlashIndex);
}

function stablePathSuffix(value: string): string {
  let hash = 0;
  for (const char of value) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  }
  return hash.toString(36);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}
