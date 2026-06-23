import type { LucideIcon } from "lucide-react";
import { Bot, Code2, Cpu, Orbit, TerminalSquare } from "lucide-react";

import { cn } from "../../lib/cn.js";

type AgentBackendIconKind = "antigravity" | "claude" | "codex" | "opencode" | "generic";

const iconByKind: Record<AgentBackendIconKind, LucideIcon> = {
  antigravity: Orbit,
  claude: Bot,
  codex: Code2,
  generic: Cpu,
  opencode: TerminalSquare
};

const labelByKind: Record<AgentBackendIconKind, string> = {
  antigravity: "Antigravity",
  claude: "Claude",
  codex: "Codex",
  generic: "Agent backend",
  opencode: "OpenCode"
};

export function AgentBackendIcon({
  backendAdapterId,
  backendLabel,
  className
}: {
  readonly backendAdapterId?: string;
  readonly backendLabel?: string;
  readonly className?: string;
}) {
  const kind = getAgentBackendIconKind(backendAdapterId, backendLabel);
  const Icon = iconByKind[kind];

  return (
    <span
      className={cn("agent-backend-icon", `agent-backend-icon-${kind}`, className)}
      title={labelByKind[kind]}
    >
      <Icon aria-hidden="true" size={15} strokeWidth={2.2} />
    </span>
  );
}

export function getAgentBackendIconKind(
  backendAdapterId: string | undefined,
  backendLabel: string | undefined
): AgentBackendIconKind {
  const haystack = `${backendAdapterId ?? ""} ${backendLabel ?? ""}`.toLowerCase();

  if (haystack.includes("antigravity")) {
    return "antigravity";
  }
  if (haystack.includes("opencode") || haystack.includes("open code")) {
    return "opencode";
  }
  if (haystack.includes("codex")) {
    return "codex";
  }
  if (haystack.includes("claude")) {
    return "claude";
  }

  return "generic";
}
