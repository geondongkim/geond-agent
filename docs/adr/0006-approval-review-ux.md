# ADR 0006: Approval Review UX and Permission Denial Mapping

## Status

Accepted

## Context

Claude Code is the default implementation route for the first paved backend
path. The workbench already had an adapter-neutral approval event type and
fixture-driven approval UI, but the live Claude Code runner still defaulted to
`plan` permission mode and did not pass a user-selected permission mode into
runner requests.

A local Claude Code probe showed that `--permission-mode default` can finish
with a `result.permission_denials` array when a write or command needs approval.
That is a useful bridge shape even before interactive approval forwarding is
implemented.

## Decision

Add a typed `defaultPermissionMode` session default with these normal UI values:

- `plan`,
- `default`,
- `acceptEdits`.

Do not expose `bypassPermissions` through normal persisted UI settings.

Pass the selected permission mode into Claude Code runner requests. Map
sanitized Claude Code `result.permission_denials` into pending
`approval.requested` workbench events. Improve the approval inspector so a user
can see risk level, jump to diff or terminal context, and resolve pending
approvals by pointer or keyboard.

## Consequences

The workbench now has a real observed bridge from Claude Code permission
behavior into local approval state. This improves confidence in the approval
review surface without committing raw logs or attempting unstable live stdin
approval forwarding.

Interactive forwarding back to Claude Code remains a later experiment. SQLite
approval table materialization also remains deferred until persistence needs
outgrow the current normalized event store boundary.
