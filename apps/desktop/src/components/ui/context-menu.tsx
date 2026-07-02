import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";

import { cn } from "../../lib/cn.js";

export interface ContextMenuItem {
  readonly key: string;
  readonly label: string;
  readonly onSelect: () => void;
  readonly danger?: boolean;
  readonly disabled?: boolean;
}

export interface ContextMenuProps {
  readonly open: boolean;
  readonly x: number;
  readonly y: number;
  readonly items: readonly ContextMenuItem[];
  readonly onClose: () => void;
}

/**
 * Minimal portal-based context menu (no external dep). Positioned at {x,y},
 * closes on outside click or Escape. Items render as menuitem buttons.
 */
export function ContextMenu({ open, x, y, items, onClose }: ContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    const handlePointerDown = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        onClose();
      }
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open, onClose]);

  if (!open || items.length === 0) {
    return null;
  }

  return createPortal(
    <div ref={ref} className="context-menu" style={{ left: x, top: y }} role="menu">
      {items.map((item) => (
        <button
          key={item.key}
          type="button"
          role="menuitem"
          className={cn("context-menu-item", item.danger ? "context-menu-item-danger" : undefined)}
          disabled={item.disabled}
          onClick={() => {
            onClose();
            item.onSelect();
          }}
        >
          {item.label}
        </button>
      ))}
    </div>,
    document.body
  );
}

// Kept for type parity with other UI primitives.
export type ContextMenuChild = ReactNode;
