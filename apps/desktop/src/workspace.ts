import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";

export interface DesktopWorkspaceDescriptor {
  readonly id: string;
  readonly label: string;
  readonly path: string;
}

export interface DesktopWorkspaceResolver {
  readonly listWorkspaces: () => Promise<readonly DesktopWorkspaceDescriptor[]>;
  readonly chooseWorkspace: (
    options?: ChooseWorkspaceOptions
  ) => Promise<DesktopWorkspaceDescriptor | undefined>;
}

export interface ChooseWorkspaceOptions {
  readonly defaultPath?: string;
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
    },
    chooseWorkspace: async (options = {}) => {
      try {
        const selected = await open({
          directory: true,
          multiple: false,
          defaultPath: options.defaultPath,
          title: "Choose geond-agent workspace"
        });

        return typeof selected === "string"
          ? createWorkspaceDescriptor(selected)
          : undefined;
      } catch {
        return undefined;
      }
    }
  };
}

function createWorkspaceDescriptor(path: string): DesktopWorkspaceDescriptor {
  return {
    id: path,
    label: basename(path),
    path
  };
}

function basename(path: string): string {
  const pieces = path.split(/[\\/]/).filter((piece) => piece.length > 0);
  return pieces[pieces.length - 1] ?? path;
}
