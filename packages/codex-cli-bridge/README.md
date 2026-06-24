# Codex CLI Bridge

Metadata-only research boundary for a future Codex CLI adapter.

This package does not run Codex, bundle Codex, import Codex source, copy Codex
App or VS Code extension assets, or read provider credentials. It exists to
prove that `@geond-agent/backend-adapter-sdk` can describe a second backend
surface without making the UI package the contract owner.

Use this package as a future adapter checklist:

- express capability metadata through the backend adapter SDK,
- model execution policy support without Claude-specific permission names,
- keep artifacts as metadata-only references until a safe export path exists,
- avoid coupling to Codex internal storage or private session state.

If source from `openai/codex` is ever imported, follow
`docs/reference/licensing.md` first and preserve Apache-2.0 notices.
