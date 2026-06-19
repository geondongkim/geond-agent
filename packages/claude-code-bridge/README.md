# Claude Code Bridge

Bridge package for Claude Code and ACP-compatible backend experiments.

## Responsibility

- Wrap Claude Code ACP execution.
- Track Goose session IDs and Claude Code session IDs.
- Experiment with list, resume, and fork behavior.
- Keep bridge-specific logic out of the desktop UI.

## Boundary

Claude Code is treated as an external user-installed tool. This package should
communicate through documented CLI, process, or protocol surfaces only.

Do not copy Claude Code internals or redistribute Claude Code binaries.
