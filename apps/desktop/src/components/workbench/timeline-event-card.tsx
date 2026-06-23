import type { WorkbenchTimelineEntry } from "@geond-agent/ui-workbench";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Bot,
  CheckCircle2,
  Clock3,
  FileDiff,
  FileText,
  GitBranch,
  Info,
  MessageSquare,
  Terminal,
  Wrench,
  XCircle
} from "lucide-react";

import { cn } from "../../lib/cn.js";
import {
  eventDotTone,
  formatEventTime,
  formatStatusLabel,
  formatTimelineKindLabel
} from "../../lib/workbench-format.js";
import type { UiI18n } from "@geond-agent/ui-workbench";
import { TimelineMarkdown } from "./timeline-markdown.js";

export function TimelineEventCard({
  entry,
  i18n
}: {
  readonly entry: WorkbenchTimelineEntry;
  readonly i18n: UiI18n;
}) {
  if (entry.kind === "assistant") {
    return <AssistantMessageCard entry={entry} i18n={i18n} />;
  }

  if (entry.kind === "issue" || entry.kind === "warning" || entry.kind === "error") {
    return <AlertEventCard entry={entry} i18n={i18n} />;
  }

  if (entry.kind === "approval") {
    return <ApprovalEventCard entry={entry} i18n={i18n} />;
  }

  return <ActivityEventCard entry={entry} i18n={i18n} />;
}

function AssistantMessageCard({
  entry,
  i18n
}: {
  readonly entry: WorkbenchTimelineEntry;
  readonly i18n: UiI18n;
}) {
  return (
    <article className="timeline-message timeline-message-assistant">
      <TimelineCardHeader
        entry={entry}
        icon={MessageSquare}
        i18n={i18n}
        title={formatTimelineKindLabel(i18n, entry.kind)}
      />
      {entry.body ? <TimelineMarkdown text={entry.body} /> : null}
      {entry.status === "streaming" ? <span className="streaming-cursor" aria-hidden="true" /> : null}
    </article>
  );
}

function ActivityEventCard({
  entry,
  i18n
}: {
  readonly entry: WorkbenchTimelineEntry;
  readonly i18n: UiI18n;
}) {
  const Icon = iconForKind(entry.kind);
  const defaultOpen = entry.kind === "command" || entry.kind === "diff" || entry.status === "failed";

  return (
    <details
      className={cn("timeline-activity", `timeline-activity-${entry.kind}`)}
      open={defaultOpen}
    >
      <summary className="timeline-activity-summary">
        <span className={cn("timeline-activity-icon", eventDotTone(entry.kind, entry.status))}>
          <Icon size={15} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="muted-meta">{formatTimelineKindLabel(i18n, entry.kind)}</span>
          <span className="timeline-activity-title">{entry.title}</span>
        </span>
        <TimelineCardMeta entry={entry} i18n={i18n} />
      </summary>
      {entry.body ? (
        <div className="timeline-activity-body">
          {entry.kind === "command" ? (
            <pre className="timeline-command-output">{entry.body}</pre>
          ) : (
            <TimelineMarkdown text={entry.body} />
          )}
        </div>
      ) : null}
    </details>
  );
}

function ApprovalEventCard({
  entry,
  i18n
}: {
  readonly entry: WorkbenchTimelineEntry;
  readonly i18n: UiI18n;
}) {
  return (
    <article className="timeline-approval-inline">
      <TimelineCardHeader entry={entry} icon={CheckCircle2} i18n={i18n} title={entry.title} />
      {entry.body ? (
        <p className="mt-2 text-sm leading-6 text-[color:var(--ink-soft)]">{entry.body}</p>
      ) : null}
    </article>
  );
}

function AlertEventCard({
  entry,
  i18n
}: {
  readonly entry: WorkbenchTimelineEntry;
  readonly i18n: UiI18n;
}) {
  const Icon = entry.kind === "error" ? XCircle : AlertTriangle;

  return (
    <article
      className={cn(
        "timeline-alert",
        (entry.kind === "error" || entry.status === "provider_overloaded") &&
          "timeline-alert-error"
      )}
    >
      <TimelineCardHeader entry={entry} icon={Icon} i18n={i18n} title={entry.title} />
      {entry.body ? (
        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[color:var(--ink-soft)]">
          {entry.body}
        </p>
      ) : null}
    </article>
  );
}

function TimelineCardHeader({
  entry,
  icon: Icon,
  i18n,
  title
}: {
  readonly entry: WorkbenchTimelineEntry;
  readonly icon: LucideIcon;
  readonly i18n: UiI18n;
  readonly title: string;
}) {
  return (
    <div className="timeline-card-header">
      <span className={cn("timeline-activity-icon", eventDotTone(entry.kind, entry.status))}>
        <Icon size={15} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="muted-meta">{formatTimelineKindLabel(i18n, entry.kind)}</p>
        <h3 className="truncate text-sm font-semibold">{title}</h3>
      </div>
      <TimelineCardMeta entry={entry} i18n={i18n} />
    </div>
  );
}

function TimelineCardMeta({
  entry,
  i18n
}: {
  readonly entry: WorkbenchTimelineEntry;
  readonly i18n: UiI18n;
}) {
  return (
    <span className="timeline-card-meta">
      {entry.status ? (
        <span className="muted-meta">{formatStatusLabel(i18n, entry.status)}</span>
      ) : null}
      {entry.at ? (
        <span className="font-mono text-[11px] text-[color:var(--ink-muted)]">
          {formatEventTime(entry.at)}
        </span>
      ) : null}
    </span>
  );
}

function iconForKind(kind: WorkbenchTimelineEntry["kind"]): LucideIcon {
  switch (kind) {
    case "session":
      return Activity;
    case "adapter":
      return GitBranch;
    case "selection":
      return Bot;
    case "context":
      return FileText;
    case "plan":
      return Clock3;
    case "tool":
      return Wrench;
    case "command":
      return Terminal;
    case "diff":
      return FileDiff;
    case "usage":
      return BarChart3;
    default:
      return Info;
  }
}
