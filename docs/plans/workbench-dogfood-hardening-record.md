# Workbench Dogfood Hardening Record

Date: 2026-06-24

This record tracks the dogfood slice that moves geond-agent closer to a practical
native workbench without weakening the local-first evidence boundary.

## Scope

- Add a Tauri save-dialog path for evidence bundle export, with browser download
  fallback for Vite and Playwright runs.
- Keep exported evidence metadata-only: raw private file contents, raw Claude
  logs, API keys, provider account state, and local session files stay out of
  normalized events and persisted settings.
- Remember recent workspace/file context paths so a user can reattach local
  metadata without reopening a picker every time.
- Add an issue/report style evidence draft surface for dogfood follow-up work.
- Split desktop vendor chunks so the first workbench bundle does not keep
  drifting upward as UI helpers are added.

## Implemented Boundary

- `write_text_file` is a native command used only after an explicit save path is
  selected by the user. It rejects blank paths, directories, and metadata bundles
  larger than the export cap.
- Recent context is stored in app-data/local settings as label, path, kind, and
  timestamp only. It does not include file contents.
- Evidence reports are derived from the existing evidence bundle projection and
  preserve the same redaction path.
- The renderer still falls back to browser downloads when it is not running
  inside Tauri.

## Dogfood Notes

- This slice is meant to make real Claude runs easier to review after the fact,
  especially when a cancel, retry, resume, or approval-follow-up path needs a
  small shareable report.
- The report draft is intentionally a side-chat draft first. It does not become
  a provider prompt until the user explicitly moves or dispatches it.
- Recent context improves workspace/file picker ergonomics, but it remains a
  metadata attachment surface. A future file-content picker must use a separate
  consent and redaction design.

## Verification Checklist

- `git diff --check`
- `pnpm --filter @geond-agent/desktop test`
- `pnpm --filter @geond-agent/desktop test:e2e`
- `cargo test --manifest-path apps/desktop/src-tauri/Cargo.toml`
- `pnpm verify`
- Diff secret/token/API key scan

## Remaining TODO

- Dogfood live Claude run cancel/retry/resume with the native export flow.
- Add a first-class issue/report export panel that can bundle multiple sessions.
- Add save-dialog export for richer evidence bundles once screenshots and
  structured traces exist.
- Add chunk budget monitoring to CI instead of relying only on Vite warnings.
- Continue workspace/file picker polish with favorites and per-workspace recent
  grouping.
