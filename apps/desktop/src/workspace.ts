import { invoke } from "@tauri-apps/api/core";

export interface DesktopWorkspaceDescriptor {
  readonly id: string;
  readonly label: string;
  readonly path: string;
}

export interface DesktopWorkspaceResolver {
  readonly listWorkspaces: () => Promise<readonly DesktopWorkspaceDescriptor[]>;
}

const FALLBACK_WORKSPACE: DesktopWorkspaceDescriptor = {
  id: "geond-agent",
  label: "geond-agent",
  path: "geond-agent"
};

export function createDesktopWorkspaceResolver(): DesktopWorkspaceResolver {
  return {
    listWorkspaces: async () => {
      try {
        const workspaces = await invoke<DesktopWorkspaceDescriptor[]>("list_workspaces");
        return workspaces.length > 0 ? workspaces : [FALLBACK_WORKSPACE];
      } catch {
        return [FALLBACK_WORKSPACE];
      }
    }
  };
}
