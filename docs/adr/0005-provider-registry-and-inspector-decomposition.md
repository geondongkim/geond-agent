# ADR 0005: Provider Registry and Inspector Decomposition

## Status

Accepted

## Context

After the desktop shell decomposition, the next risk was selection metadata
drift. Backend, provider route, and model labels existed in several places:

- desktop picker option arrays,
- Z.ai provider helper metadata,
- Claude Code adapter capability metadata,
- Claude Code stream-json selection fallback helpers.

This made the backend/model picker look real in the UI while still being partly
hardcoded. It would also make future OpenCode, Cline, ACP, or local-model
entries harder to add safely.

## Decision

Introduce a neutral workbench selection catalog:

- backend adapter entries,
- provider route entries,
- model profile entries,
- lookup helpers,
- option builders,
- stale-default validation helpers.

Provider and bridge packages may expose catalog-shaped entries, but the
renderer should compose them through a desktop catalog boundary rather than
hardcoding picker choices in pane files.

The inspector is split into per-tab modules in the same slice because the
settings and selection tabs are now catalog-driven and the prior single-file
inspector would otherwise grow again.

## Consequences

The desktop settings picker and bridge stream-json normalizer now consume the
same metadata contract. Persisted session defaults can be validated against the
catalog before use. Future backend expansion can add entries at the catalog
boundary instead of editing the inspector directly.

The catalog exposes API key presence only as boolean/enum metadata. It must
never expose key values, provider account state, raw Claude Code logs, or local
private session files.

Approval forwarding, auto routing policy, snapshot materialization, and
OpenCode/Cline registry entries remain separate future slices.
