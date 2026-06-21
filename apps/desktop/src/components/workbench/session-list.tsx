import type { UiI18n } from "@geond-agent/ui-workbench";

import type { ProjectedSessionListItem } from "../../lib/workbench-types.js";
import { EmptyState } from "./empty-state.js";
import { SessionCard } from "./session-card.js";

export function SessionList({
  activeSessionId,
  emptyText,
  i18n,
  onSelect,
  sessions,
  title
}: {
  readonly activeSessionId?: string;
  readonly emptyText: string;
  readonly i18n: UiI18n;
  readonly onSelect: (sessionId: string) => void;
  readonly sessions: readonly ProjectedSessionListItem[];
  readonly title: string;
}) {
  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="panel-title">{title}</h3>
        <span className="font-mono text-[11px] text-[color:var(--ink-muted)]">{sessions.length}</span>
      </div>
      <div className="space-y-1.5">
        {sessions.length ? (
          sessions.map((session) => (
            <SessionCard
              key={session.id}
              session={session}
              active={session.id === activeSessionId}
              i18n={i18n}
              onSelect={() => onSelect(session.id)}
            />
          ))
        ) : (
          <EmptyState text={emptyText} />
        )}
      </div>
    </section>
  );
}
