import type { LocalSettingsStore } from "@geond-agent/ui-workbench";

export const SIDE_CHAT_DRAFTS_SETTINGS_KEY = "geond-agent.workbench.side-chat-drafts";
const MAX_DRAFTS = 20;
const MAX_TEXT_LENGTH = 4000;
const MAX_SOURCE_LABEL_LENGTH = 240;

export interface SideChatDraft {
  readonly id: string;
  readonly sourceLabel?: string;
  readonly sessionId?: string;
  readonly text: string;
}

export interface CreateSideChatDraftOptions {
  readonly now?: number;
  readonly sessionId?: string;
}

export async function loadSideChatDrafts(
  settingsStore: LocalSettingsStore
): Promise<readonly SideChatDraft[]> {
  const saved = await settingsStore.getItem(SIDE_CHAT_DRAFTS_SETTINGS_KEY);
  if (!saved) {
    return [];
  }

  try {
    return normalizeSideChatDrafts(JSON.parse(saved));
  } catch {
    return [];
  }
}

export async function saveSideChatDrafts(
  settingsStore: LocalSettingsStore,
  drafts: readonly SideChatDraft[]
): Promise<readonly SideChatDraft[]> {
  const normalized = normalizeSideChatDrafts(drafts);
  await settingsStore.setItem(SIDE_CHAT_DRAFTS_SETTINGS_KEY, JSON.stringify(normalized));
  return normalized;
}

export function createSideChatDraft(
  text: string,
  sourceLabel?: string,
  options: CreateSideChatDraftOptions | number = {}
): SideChatDraft | undefined {
  const normalizedText = normalizeText(text, MAX_TEXT_LENGTH);
  if (!normalizedText) {
    return undefined;
  }

  const now = typeof options === "number" ? options : options.now ?? Date.now();
  const sessionId = typeof options === "number" ? undefined : normalizeText(options.sessionId, 160);
  const normalizedSourceLabel = normalizeText(sourceLabel, MAX_SOURCE_LABEL_LENGTH);
  return {
    id: `side-chat-draft-${now}-${stableTextSuffix(normalizedText)}`,
    text: normalizedText,
    sessionId,
    sourceLabel: normalizedSourceLabel
  };
}

export function filterSideChatDraftsForSession(
  drafts: readonly SideChatDraft[],
  sessionId: string | undefined
): readonly SideChatDraft[] {
  if (!sessionId) {
    return drafts.filter((draft) => !draft.sessionId);
  }

  return drafts.filter((draft) => !draft.sessionId || draft.sessionId === sessionId);
}

export function normalizeSideChatDrafts(value: unknown): readonly SideChatDraft[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .flatMap((entry, index) => normalizeSideChatDraft(entry, index))
    .slice(-MAX_DRAFTS);
}

function normalizeSideChatDraft(value: unknown, index: number): readonly SideChatDraft[] {
  if (!isRecord(value)) {
    return [];
  }

  const text = normalizeText(value.text, MAX_TEXT_LENGTH);
  if (!text) {
    return [];
  }

  return [
    {
      id: normalizeText(value.id, 160) ?? `side-chat-draft-${index}`,
      text,
      sessionId: normalizeText(value.sessionId, 160),
      sourceLabel: normalizeText(value.sourceLabel, MAX_SOURCE_LABEL_LENGTH)
    }
  ];
}

function normalizeText(value: unknown, maxLength: number): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed.slice(0, maxLength) : undefined;
}

function stableTextSuffix(value: string): string {
  let hash = 0;
  for (const char of value) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  }
  return hash.toString(36);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}
