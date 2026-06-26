# Codex CLI Bridge

Codex CLI adapter boundary for upstream-informed JSONL event replay.

This package describes Codex as a backend adapter through
`@geond-agent/backend-adapter-sdk` and normalizes sanitized Codex-style JSONL
events into `WorkbenchEvent` streams. It is based on source inspection of the
Apache-2.0 `openai/codex` TypeScript SDK event and exec boundary at commit
`98845e484070a1f93fa24842db0e429c7cec9f81`.

Implemented boundary:

- backend metadata and capability reporting through the adapter SDK,
- adapter-neutral execution policy ids mapped to Codex sandbox/approval policy,
- Codex `thread/turn/item` JSONL normalizer,
- sanitized synthetic fixture replay,
- command boundary that sends prompts through stdin instead of visible argv,
- stable `--json` command output by default with an experimental JSON flag
  option for upstream SDK probes,
- external thread id resume metadata.

This package still does not bundle Codex, copy Codex App or VS Code extension
assets, read provider credentials, commit raw local Codex logs, or persist
private Codex session state. The desktop app can use sanitized fixture replay
outside Tauri and a Tauri native process boundary inside the packaged shell.
Live Codex session continuity, approvals, and event fidelity still require
dogfood validation before Codex becomes a recommended default route.

If source from `openai/codex` is copied in a future PR, follow
`docs/reference/licensing.md` first and preserve Apache-2.0 license and NOTICE
requirements.
