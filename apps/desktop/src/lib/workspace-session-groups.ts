import type { ProjectedSessionListItem } from "./workbench-types.js";

export interface WorkspaceSessionGroup {
  readonly path: string;
  readonly label: string;
  readonly sessions: readonly ProjectedSessionListItem[];
  readonly pinnedCount: number;
  readonly favorite: boolean;
  readonly updatedAt?: string;
  readonly selected: boolean;
}

export interface WorkspaceSessionGroupInput {
  readonly sessions: readonly ProjectedSessionListItem[];
  readonly pinnedSessionIds: readonly string[];
  readonly workspaceOptions: readonly WorkspaceSessionOption[];
  readonly selectedWorkspacePath: string;
  readonly sessionQuery: string;
  readonly unknownWorkspaceLabel: string;
}

export interface WorkspaceSessionOption {
  readonly label: string;
  readonly path: string;
  readonly favorite?: boolean;
  readonly updatedAt?: string;
}

interface MutableWorkspaceSessionGroup {
  path: string;
  label: string;
  sessions: ProjectedSessionListItem[];
  pinnedCount: number;
  favorite: boolean;
  updatedAt?: string;
  selected: boolean;
}

export function createWorkspaceSessionGroups({
  sessions,
  pinnedSessionIds,
  selectedWorkspacePath,
  sessionQuery,
  unknownWorkspaceLabel,
  workspaceOptions
}: WorkspaceSessionGroupInput): readonly WorkspaceSessionGroup[] {
  const pinnedSessionIdSet = new Set(pinnedSessionIds);
  const query = sessionQuery.trim().toLowerCase();
  const groups = new Map<string, MutableWorkspaceSessionGroup>();

  workspaceOptions.forEach((workspace) => {
    groups.set(workspace.path, {
      path: workspace.path,
      label: workspace.label,
      sessions: [],
      pinnedCount: 0,
      favorite: workspace.favorite === true,
      updatedAt: workspace.updatedAt,
      selected: workspace.path === selectedWorkspacePath
    });
  });

  sessions.forEach((session) => {
    const path = session.workspacePath ?? "__unknown__";
    const group =
      groups.get(path) ??
      createWorkspaceGroup(path, path === "__unknown__" ? unknownWorkspaceLabel : basename(path), {
        selected: path === selectedWorkspacePath
      });
    groups.set(path, group);

    if (!matchesSessionQuery(session, query)) {
      return;
    }

    group.sessions.push(session);
    if (pinnedSessionIdSet.has(session.id)) {
      group.pinnedCount += 1;
    }
    group.updatedAt = maxMaybeIso(group.updatedAt, session.updatedAt);
  });

  const visibleGroups = Array.from(groups.values())
    .map((group) => ({
      ...group,
      sessions: sortSessionsForWorkspace(group.sessions, pinnedSessionIdSet)
    }))
    .filter((group) => shouldShowWorkspaceGroup(group, query));

  if (visibleGroups.length === 0 && groups.size > 0) {
    const selectedGroup =
      Array.from(groups.values()).find((group) => group.selected) ??
      Array.from(groups.values())[0];
    return selectedGroup
      ? [
          {
            ...selectedGroup,
            sessions: []
          }
        ]
      : [];
  }

  return visibleGroups.sort(compareWorkspaceGroups);
}

function createWorkspaceGroup(
  path: string,
  label: string,
  options: { readonly selected: boolean }
): MutableWorkspaceSessionGroup {
  return {
    path,
    label,
    sessions: [],
    pinnedCount: 0,
    favorite: false,
    selected: options.selected
  };
}

function shouldShowWorkspaceGroup(
  group: WorkspaceSessionGroup,
  query: string
): boolean {
  if (query.length > 0) {
    return group.sessions.length > 0;
  }

  return group.sessions.length > 0 || group.selected || group.favorite || Boolean(group.updatedAt);
}

function matchesSessionQuery(
  session: ProjectedSessionListItem,
  normalizedQuery: string
): boolean {
  if (normalizedQuery.length === 0) {
    return true;
  }

  return [
    session.id,
    session.title,
    session.workspacePath,
    session.backendAdapterId,
    session.backendLabel,
    session.lifecycle
  ]
    .filter((value): value is string => typeof value === "string")
    .some((value) => value.toLowerCase().includes(normalizedQuery));
}

function sortSessionsForWorkspace(
  sessions: readonly ProjectedSessionListItem[],
  pinnedSessionIds: ReadonlySet<string>
): readonly ProjectedSessionListItem[] {
  return [...sessions].sort((left, right) => {
    const pinnedComparison =
      Number(pinnedSessionIds.has(right.id)) - Number(pinnedSessionIds.has(left.id));
    return pinnedComparison || compareMaybeIso(right.updatedAt, left.updatedAt);
  });
}

function compareWorkspaceGroups(
  left: WorkspaceSessionGroup,
  right: WorkspaceSessionGroup
): number {
  if (left.selected !== right.selected) {
    return left.selected ? -1 : 1;
  }
  if (left.favorite !== right.favorite) {
    return left.favorite ? -1 : 1;
  }

  return (
    compareMaybeIso(right.updatedAt, left.updatedAt) ||
    left.label.localeCompare(right.label) ||
    left.path.localeCompare(right.path)
  );
}

function maxMaybeIso(
  left: string | undefined,
  right: string | undefined
): string | undefined {
  if (!left) {
    return right;
  }
  if (!right) {
    return left;
  }

  return compareMaybeIso(left, right) >= 0 ? left : right;
}

function compareMaybeIso(
  left: string | undefined,
  right: string | undefined
): number {
  if (!left && !right) {
    return 0;
  }
  if (!left) {
    return -1;
  }
  if (!right) {
    return 1;
  }

  return Date.parse(left) - Date.parse(right);
}

function basename(path: string): string {
  return path.split(/[\\/]/).filter(Boolean).at(-1) ?? path;
}
