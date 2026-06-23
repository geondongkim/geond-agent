import { describe, expect, it } from "vitest";

import type { ProjectedSessionListItem } from "./workbench-types.js";
import { createWorkspaceSessionGroups } from "./workspace-session-groups.js";

function makeSession(
  id: string,
  options: Partial<ProjectedSessionListItem> = {}
): ProjectedSessionListItem {
  return {
    id,
    title: options.title ?? id,
    lifecycle: options.lifecycle ?? "completed",
    workspacePath: options.workspacePath,
    backendAdapterId: options.backendAdapterId,
    backendLabel: options.backendLabel,
    updatedAt: options.updatedAt,
    resumable: options.resumable ?? false,
    pendingApprovalCount: options.pendingApprovalCount ?? 0,
    warningCount: options.warningCount ?? 0,
    errorCount: options.errorCount ?? 0
  };
}

describe("createWorkspaceSessionGroups", () => {
  it("groups sessions below workspace entries and keeps the selected workspace first", () => {
    const groups = createWorkspaceSessionGroups({
      pinnedSessionIds: [],
      selectedWorkspacePath: "/workspace/geond-agent",
      sessionQuery: "",
      unknownWorkspaceLabel: "Unknown",
      workspaceOptions: [
        { label: "ONMU", path: "/workspace/onmu" },
        { label: "geond-agent", path: "/workspace/geond-agent" }
      ],
      sessions: [
        makeSession("session-onmu", {
          workspacePath: "/workspace/onmu",
          updatedAt: "2026-06-23T01:00:00.000Z"
        }),
        makeSession("session-geond", {
          workspacePath: "/workspace/geond-agent",
          updatedAt: "2026-06-22T01:00:00.000Z"
        })
      ]
    });

    expect(groups.map((group) => group.path)).toEqual([
      "/workspace/geond-agent",
      "/workspace/onmu"
    ]);
    expect(groups[0]?.selected).toBe(true);
    expect(groups[0]?.sessions.map((session) => session.id)).toEqual(["session-geond"]);
  });

  it("sorts pinned sessions before recent sessions within each workspace", () => {
    const groups = createWorkspaceSessionGroups({
      pinnedSessionIds: ["older-pinned"],
      selectedWorkspacePath: "/workspace/geond-agent",
      sessionQuery: "",
      unknownWorkspaceLabel: "Unknown",
      workspaceOptions: [{ label: "geond-agent", path: "/workspace/geond-agent" }],
      sessions: [
        makeSession("newer", {
          workspacePath: "/workspace/geond-agent",
          updatedAt: "2026-06-23T02:00:00.000Z"
        }),
        makeSession("older-pinned", {
          workspacePath: "/workspace/geond-agent",
          updatedAt: "2026-06-22T02:00:00.000Z"
        })
      ]
    });

    expect(groups[0]?.pinnedCount).toBe(1);
    expect(groups[0]?.sessions.map((session) => session.id)).toEqual([
      "older-pinned",
      "newer"
    ]);
  });

  it("searches backend metadata without filtering by selected workspace", () => {
    const groups = createWorkspaceSessionGroups({
      pinnedSessionIds: [],
      selectedWorkspacePath: "/workspace/geond-agent",
      sessionQuery: "opencode",
      unknownWorkspaceLabel: "Unknown",
      workspaceOptions: [
        { label: "geond-agent", path: "/workspace/geond-agent" },
        { label: "side-route", path: "/workspace/side-route" }
      ],
      sessions: [
        makeSession("claude-session", {
          workspacePath: "/workspace/geond-agent",
          backendAdapterId: "claude-code.external-cli-acp"
        }),
        makeSession("opencode-session", {
          workspacePath: "/workspace/side-route",
          backendAdapterId: "opencode.external-cli"
        })
      ]
    });

    expect(groups).toHaveLength(1);
    expect(groups[0]?.path).toBe("/workspace/side-route");
    expect(groups[0]?.sessions.map((session) => session.id)).toEqual(["opencode-session"]);
  });
});
