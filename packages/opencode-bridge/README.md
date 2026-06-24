# OpenCode Bridge

Metadata-only research boundary for a future OpenCode adapter.

This package does not run OpenCode, bundle OpenCode, import OpenCode source, copy
generated assets, read provider credentials, or persist local session files. It
exists to prove that `@geond-agent/backend-adapter-sdk` can describe another
backend surface without making `@geond-agent/ui-workbench` the source of truth.

Use this package as a future adapter checklist:

- express capability metadata through the backend adapter SDK,
- keep provider authentication host-mediated unless a safe local secret boundary
  is explicitly designed,
- model OpenCode-style selected model and mode variants separately from
  provider/model catalogs,
- correlate permission diff prompts to normalized `diff.emitted` and
  `approval.requested` events,
- avoid copying OpenCode implementation code or raw local logs.

If source from OpenCode is ever imported, follow
`docs/reference/licensing.md` first and preserve MIT license text and notices.
