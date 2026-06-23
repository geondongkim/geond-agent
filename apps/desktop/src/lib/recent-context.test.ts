import { describe, expect, it } from "vitest";
import type { LocalSettingsStore } from "@geond-agent/ui-workbench";

import {
  createRecentContextItem,
  loadRecentContextItems,
  mergeRecentContextItem,
  normalizeRecentContextItems,
  saveRecentContextItems
} from "./recent-context.js";

describe("recent context", () => {
  it("creates metadata-only recent workspace and file entries", () => {
    expect(
      createRecentContextItem({
        kind: "workspace",
        path: "/workspace/geond-agent",
        updatedAt: "2026-06-24T00:00:00.000Z"
      })
    ).toMatchObject({
      kind: "workspace",
      label: "geond-agent",
      path: "/workspace/geond-agent"
    });
    expect(
      createRecentContextItem({
        kind: "file",
        label: "architecture.md",
        path: "/workspace/geond-agent/docs/architecture.md"
      })
    ).toMatchObject({
      kind: "file",
      label: "architecture.md"
    });
    expect(createRecentContextItem({ kind: "file", path: " " })).toBeUndefined();
  });

  it("normalizes, sorts, deduplicates, and caps recent context entries", () => {
    const normalized = normalizeRecentContextItems([
      {
        kind: "workspace",
        label: "Old",
        path: "/workspace/geond-agent",
        updatedAt: "2026-06-23T00:00:00.000Z"
      },
      {
        kind: "workspace",
        label: "New",
        path: "/workspace/geond-agent",
        updatedAt: "2026-06-24T00:00:00.000Z"
      },
      ...Array.from({ length: 10 }, (_, index) => ({
        kind: "file",
        label: `file-${index}.ts`,
        path: `/workspace/geond-agent/file-${index}.ts`,
        updatedAt: `2026-06-24T00:00:0${index}.000Z`
      }))
    ]);

    expect(normalized).toHaveLength(8);
    expect(normalized[0]).toMatchObject({ label: "file-9.ts" });
    expect(normalized.filter((item) => item.path === "/workspace/geond-agent")).toHaveLength(0);
  });

  it("merges one item to the front", () => {
    const current = [
      {
        id: "workspace:old",
        kind: "workspace" as const,
        label: "geond-agent",
        path: "/workspace/geond-agent",
        updatedAt: "2026-06-23T00:00:00.000Z"
      }
    ];
    const next = mergeRecentContextItem(
      current,
      createRecentContextItem({
        kind: "workspace",
        label: "geond-agent",
        path: "/workspace/geond-agent",
        updatedAt: "2026-06-24T00:00:00.000Z"
      })
    );

    expect(next).toHaveLength(1);
    expect(next[0]?.updatedAt).toBe("2026-06-24T00:00:00.000Z");
  });

  it("round trips through local settings without raw content", async () => {
    const storage = new Map<string, string>();
    const settingsStore: LocalSettingsStore = {
      getItem: (key) => storage.get(key) ?? null,
      setItem: (key, value) => {
        storage.set(key, value);
      }
    };

    await saveRecentContextItems(settingsStore, [
      {
        id: "file:a",
        kind: "file",
        label: "architecture.md",
        path: "/workspace/geond-agent/docs/architecture.md",
        updatedAt: "2026-06-24T00:00:00.000Z"
      }
    ]);

    await expect(loadRecentContextItems(settingsStore)).resolves.toEqual([
      {
        id: "file:a",
        kind: "file",
        label: "architecture.md",
        path: "/workspace/geond-agent/docs/architecture.md",
        updatedAt: "2026-06-24T00:00:00.000Z"
      }
    ]);
    expect([...storage.values()].join("\n")).not.toContain("raw");
  });
});
