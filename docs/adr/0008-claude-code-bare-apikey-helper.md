# ADR 0008: Claude Code Bare Auth Through Local apiKeyHelper

## Status

Accepted

## Context

`geond-agent` uses Claude Code as the first paved external CLI backend while
keeping Z.ai provider credentials local to the selected workspace. During live
dogfood of Claude Code `--bare` with the Z.ai Anthropic-compatible route,
shell-only `ANTHROPIC_API_KEY` and `ANTHROPIC_AUTH_TOKEN` handoffs were not a
reliable primary path. The stable route was Claude Code `--settings` with an
`apiKeyHelper` that reads a short-lived local token file.

The workbench must not return API keys to the renderer, store provider secrets
in SQLite, commit local env files, or persist raw Claude logs.

## Decision

For Claude Code `--bare` runs, keep `ZAI_API_KEY` as the workspace-local source
secret and create an ephemeral Claude settings boundary immediately before
launch:

- write the key value to a private temporary file,
- write a private helper script that prints that file,
- pass the helper path as `apiKeyHelper` in a temporary Claude `--settings`
  file,
- pass only non-secret routing metadata such as base URL, model aliases, and
  timeout values through settings/env,
- delete the temporary key, helper, and settings files after the process exits.

Do not use `ANTHROPIC_API_KEY` or `ANTHROPIC_AUTH_TOKEN` as the primary
child-process auth path for Claude Code `--bare`. They may remain as recognized
input names at the local env loading boundary only when needed for compatibility
or migration, but the runner must keep secret values out of child environment
snapshots, renderer state, SQLite persistence, evidence exports, and commits.

## Consequences

Claude Code can be launched through the Z.ai route without browser login and
without copying provider secrets into durable workbench state. The approach is
compatible with the local-first event model: normalized run metadata may be
stored, but the secret value and raw provider transcript remain outside the
workbench database.

The tradeoff is a stricter native runner boundary. Tests and reviews must verify
that temporary files are private, removed after execution, and never surfaced in
redacted command previews or evidence bundles.
