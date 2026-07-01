import { invoke } from "@tauri-apps/api/core";
import type { WorkbenchEvent } from "@geond-agent/ui-workbench";

export interface NativeSessionRecord {
  id: string;
  source: "claude" | "codex";
  title: string;
  updatedAt?: string;
  messageCount: number;
  workspacePath?: string;
}

/**
 * Checks if the code is running in a Tauri runtime by looking for the __TAURI_INTERNALS__ object.
 */
function isTauriRuntime(): boolean {
  return Boolean((globalThis as { readonly __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__);
}

/**
 * Lists native sessions from the specified source (claude or codex).
 * Returns empty array when not in Tauri runtime (e.g., vite dev).
 */
export async function listNativeSessions(
  workspacePath: string | undefined,
  source: "claude" | "codex",
  options: { readonly invokeFn?: typeof invoke } = {}
): Promise<readonly NativeSessionRecord[]> {
  if (!isTauriRuntime()) {
    return [];
  }

  try {
    const run = options.invokeFn ?? invoke;
    const sessions = await run<readonly NativeSessionRecord[]>("list_native_sessions", {
      workspacePath: workspacePath ?? null,
      source
    });
    return sessions;
  } catch (error) {
    console.error(`Failed to list native ${source} sessions:`, error);
    return [];
  }
}

/**
 * Reads events from a native session by source and id.
 * Returns empty array when not in Tauri runtime (e.g., vite dev).
 */
export async function readNativeSession(
  source: "claude" | "codex",
  id: string,
  workspacePath: string | undefined,
  options: { readonly invokeFn?: typeof invoke } = {}
): Promise<readonly WorkbenchEvent[]> {
  if (!isTauriRuntime()) {
    return [];
  }

  try {
    const run = options.invokeFn ?? invoke;
    const events = await run<readonly WorkbenchEvent[]>("read_native_session", {
      source,
      id,
      workspacePath: workspacePath ?? null
    });
    return events;
  } catch (error) {
    console.error(`Failed to read native session ${source}:${id}:`, error);
    return [];
  }
}