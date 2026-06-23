import type { UiI18n, WorkbenchContextAttachmentKind } from "@geond-agent/ui-workbench";

export const lifecycleTone = {
  started: "status-ok",
  resumed: "status-ok",
  created: "status-neutral",
  paused: "status-warn",
  completed: "status-ok",
  failed: "status-danger"
} as const;

export const backendTone = {
  ready: "status-ok",
  attention: "status-warn",
  unknown: "status-neutral"
} as const;

export function formatMessage(
  template: string,
  values: Readonly<Record<string, string | number>>
): string {
  return Object.entries(values).reduce(
    (message, [key, value]) => message.replaceAll(`{${key}}`, String(value)),
    template
  );
}

export function formatAgentLanguageLabel(i18n: UiI18n, language: string): string {
  switch (language) {
    case "system":
      return i18n.t("workbench.language.system");
    case "ko":
      return "한국어";
    case "en":
      return "English";
    default:
      return language;
  }
}

export function formatRoutingModeLabel(
  i18n: UiI18n,
  mode: string | undefined
): string {
  switch (mode) {
    case "manual":
      return i18n.t("workbench.selection.manual");
    case "auto":
      return i18n.t("workbench.selection.auto");
    default:
      return mode ?? i18n.t("workbench.status.unknown");
  }
}

export function formatApprovalDecision(i18n: UiI18n, decision: string): string {
  switch (decision) {
    case "approved":
      return i18n.t("workbench.approvals.decisionApproved");
    case "rejected":
      return i18n.t("workbench.approvals.decisionRejected");
    case "cancelled":
      return i18n.t("workbench.approvals.decisionCancelled");
    default:
      return decision;
  }
}

export function formatStatusLabel(i18n: UiI18n, status: string): string {
  switch (status) {
    case "created":
      return i18n.t("workbench.status.created");
    case "resumed":
      return i18n.t("workbench.status.resumed");
    case "paused":
      return i18n.t("workbench.status.paused");
    case "completed":
      return i18n.t("workbench.status.completed");
    case "started":
      return i18n.t("workbench.status.started");
    case "ready":
      return i18n.t("workbench.status.ready");
    case "attention":
      return i18n.t("workbench.status.attention");
    case "running":
    case "in_progress":
      return i18n.t("workbench.status.running");
    case "succeeded":
    case "approved":
      return i18n.t("workbench.status.succeeded");
    case "pending":
      return i18n.t("workbench.status.pending");
    case "failed":
    case "rejected":
      return i18n.t("workbench.status.failed");
    case "cancelled":
      return i18n.t("workbench.status.cancelled");
    case "workspace":
    case "file":
    case "selection":
    case "note":
      return formatContextKindLabel(i18n, status);
    default:
      return status;
  }
}

export function formatTimelineKindLabel(i18n: UiI18n, kind: string): string {
  switch (kind) {
    case "session":
      return i18n.t("workbench.timeline.kind.session");
    case "adapter":
      return i18n.t("workbench.timeline.kind.adapter");
    case "selection":
      return i18n.t("workbench.timeline.kind.selection");
    case "context":
      return i18n.t("workbench.timeline.kind.context");
    case "assistant":
      return i18n.t("workbench.timeline.kind.assistant");
    case "plan":
      return i18n.t("workbench.timeline.kind.plan");
    case "tool":
      return i18n.t("workbench.timeline.kind.tool");
    case "command":
      return i18n.t("workbench.timeline.kind.command");
    case "diff":
      return i18n.t("workbench.timeline.kind.diff");
    case "usage":
      return i18n.t("workbench.timeline.kind.usage");
    case "run":
      return i18n.t("workbench.timeline.kind.run");
    case "approval":
      return i18n.t("workbench.timeline.kind.approval");
    case "warning":
      return i18n.t("workbench.timeline.kind.warning");
    case "error":
      return i18n.t("workbench.timeline.kind.error");
    default:
      return kind;
  }
}

export function formatContextKindLabel(
  i18n: UiI18n,
  kind: WorkbenchContextAttachmentKind
): string {
  switch (kind) {
    case "workspace":
      return i18n.t("workbench.context.kind.workspace");
    case "file":
      return i18n.t("workbench.context.kind.file");
    case "selection":
      return i18n.t("workbench.context.kind.selection");
    case "note":
      return i18n.t("workbench.context.kind.note");
  }
}

export function formatUsageSourceLabel(i18n: UiI18n, source: string): string {
  switch (source) {
    case "backend":
      return i18n.t("workbench.usage.sourceBackend");
    case "provider":
      return i18n.t("workbench.usage.sourceProvider");
    case "model":
      return i18n.t("workbench.usage.sourceModel");
    default:
      return source;
  }
}

export function formatUsageNumber(i18n: UiI18n, value: number | undefined): string {
  return value === undefined
    ? i18n.t("workbench.status.notAvailable")
    : new Intl.NumberFormat("en").format(value);
}

export function formatUsageCost(i18n: UiI18n, value: number | undefined): string {
  return value === undefined ? i18n.t("workbench.status.notAvailable") : `$${value.toFixed(4)}`;
}

export function approvalTone(status: string, decision?: string): string {
  if (status === "pending") {
    return "status-warn";
  }

  switch (decision) {
    case "approved":
      return "status-ok";
    case "rejected":
      return "status-danger";
    default:
      return "status-neutral";
  }
}

export function eventCardTone(kind: string): string {
  switch (kind) {
    case "command":
      return "event-card-command";
    case "usage":
      return "event-card-usage";
    case "run":
      return "event-card-command";
    case "warning":
    case "error":
      return "event-card-warning";
    default:
      return "";
  }
}

export function eventDotTone(kind: string, status?: string): string {
  if (kind === "command") {
    return "event-dot-command";
  }

  if (kind === "usage") {
    return "event-dot-usage";
  }

  if (kind === "run") {
    return status === "running" ? "event-dot-command" : "";
  }

  if (kind === "warning" || kind === "error" || status === "failed") {
    return "event-dot-warning";
  }

  if (status === "succeeded" || status === "completed" || status === "approved") {
    return "event-dot-ok";
  }

  return "";
}

export function eventBodyTone(kind: string): string {
  switch (kind) {
    case "command":
      return "text-[color:var(--inverse-soft)] font-mono text-xs";
    default:
      return "text-[color:var(--ink-soft)]";
  }
}

export function formatEventTime(value: string): string {
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) {
    return value;
  }

  return new Intl.DateTimeFormat("en", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  }).format(parsed);
}

export function formatProviderSummary(value: string): string {
  return value.replaceAll(" ", " · ");
}

export function formatExternalSessionId(value: string): string {
  if (value.length <= 16) {
    return value;
  }

  return `${value.slice(0, 8)}...${value.slice(-4)}`;
}
