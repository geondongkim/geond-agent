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
