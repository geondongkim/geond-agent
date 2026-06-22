import { useEffect, useMemo, useState } from "react";
import type { UiI18n } from "@geond-agent/ui-workbench";

import { Button } from "../ui/button.js";
import { cn } from "../../lib/cn.js";

export interface CommandPaletteAction {
  readonly id: string;
  readonly label: string;
  readonly detail?: string;
  readonly disabled?: boolean;
  readonly run: () => void;
}

export function CommandPalette({
  actions,
  i18n,
  onClose,
  open
}: {
  readonly actions: readonly CommandPaletteAction[];
  readonly i18n: UiI18n;
  readonly onClose: () => void;
  readonly open: boolean;
}) {
  const [query, setQuery] = useState("");
  const visibleActions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return actions;
    }

    return actions.filter((action) =>
      [action.label, action.detail]
        .filter((value): value is string => Boolean(value))
        .some((value) => value.toLowerCase().includes(normalizedQuery))
    );
  }, [actions, query]);
  const firstEnabledAction = visibleActions.find((action) => !action.disabled);

  useEffect(() => {
    if (!open) {
      setQuery("");
    }
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose, open]);

  if (!open) {
    return null;
  }

  const runAction = (action: CommandPaletteAction | undefined) => {
    if (!action || action.disabled) {
      return;
    }
    action.run();
    onClose();
  };

  return (
    <div className="command-palette-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        aria-label={i18n.t("workbench.commandPalette.title")}
        aria-modal="true"
        className="command-palette"
        role="dialog"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="command-palette-header">
          <div>
            <h2 className="text-sm font-semibold">{i18n.t("workbench.commandPalette.title")}</h2>
            <p className="muted-meta mt-1">Cmd/Ctrl+K</p>
          </div>
          <Button variant="ghost" onClick={onClose}>
            Esc
          </Button>
        </div>
        <input
          autoFocus
          aria-label={i18n.t("workbench.commandPalette.search")}
          className="command-palette-input"
          placeholder={i18n.t("workbench.commandPalette.search")}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              runAction(firstEnabledAction);
            }
          }}
        />
        <div className="command-palette-list">
          {visibleActions.length ? (
            visibleActions.map((action) => (
              <button
                key={action.id}
                className={cn("command-palette-item", action.disabled && "opacity-45")}
                disabled={action.disabled}
                type="button"
                onClick={() => runAction(action)}
              >
                <span className="truncate text-sm font-semibold">{action.label}</span>
                {action.detail ? (
                  <span className="truncate font-mono text-[11px] text-[color:var(--ink-muted)]">
                    {action.detail}
                  </span>
                ) : null}
              </button>
            ))
          ) : (
            <p className="px-3 py-6 text-sm text-[color:var(--ink-soft)]">
              {i18n.t("workbench.commandPalette.noResults")}
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
