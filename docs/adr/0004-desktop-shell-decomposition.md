# ADR 0004: Desktop Shell Decomposition

## Status

Accepted

## Context

After the first native workbench slices, `apps/desktop/src/app.tsx` owned too
many responsibilities at once:

- session rail rendering,
- timeline rendering,
- inspector rendering,
- runner state,
- live Claude Code stream handling,
- derived projection filtering,
- settings option construction,
- session actions such as pin, delete, resume, approval resolution, and
  workspace selection.

This made the root shell hard to review before larger features such as approval
forwarding, provider registry, persistence snapshots, and backend/model picker
polish. A Claude Code `opus` advisory through the Z.ai route independently
recommended app-shell decomposition before adding new product surface area.

## Decision

Decompose the desktop app shell before the next feature slice:

- keep `App` as the composition root,
- move left/center/right workbench surfaces into pane modules,
- move repeated display primitives into `components/workbench`,
- move derived projection filtering into `useWorkbenchDerivedState`,
- move user actions into `useWorkbenchActions`,
- move settings option construction into `useWorkbenchOptions`,
- move live Claude runner state, prelude events, completion events, and stream
  listener helpers into `runs/*`,
- keep formatting helpers in `lib/workbench-format`.

This slice must not add new event types, provider calls, persistence tables,
Tauri commands, or third-party source code. It is a behavior-preserving
decomposition that prepares the shell for the next larger implementation loop.

## Consequences

The root desktop app can now be reviewed as layout wiring instead of a dense
feature implementation file. Pane modules can evolve independently as the
Codex-like UI grows. Runner helpers are testable without rendering React, and
selection/stream formatting is covered by focused Vitest tests.

The tradeoff is more files and explicit prop boundaries. That is acceptable for
this stage because the workbench is now a multi-surface product rather than a
single demo component.

## Follow-ups

- Done in ADR 0005: split the inspector into per-tab modules when the
  catalog-driven backend/model picker feature landed.
- Keep Playwright focused on shell workflows and Vitest focused on reducers,
  normalizers, helpers, and runner event factories.
- Continue deferring approval forwarding until the Claude Code permission event
  shape is confirmed.
