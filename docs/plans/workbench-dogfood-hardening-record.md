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
- Workspace reports aggregate the session index plus the active session evidence
  bundle into a metadata-only report that can be queued as a side-chat draft or
  exported through the same save/download path.
- Recent context now supports favorites. Favorites store only the same label,
  path, kind, timestamp, and boolean marker as recent context.
- Evidence export manifests describe export-ready documents, session counts,
  favorite context groups, deferred screenshot/trace slots, and the excluded
  data classes before a report is shared.
- Recent context rendering groups items by workspace hint so favorite files are
  reviewed under the workspace they came from rather than as a flat list.
- Desktop build now enforces chunk budgets after Vite emits assets so bundle
  growth is caught in `pnpm build`, `pnpm verify`, and CI.

## Dogfood Notes

- This slice is meant to make real Claude runs easier to review after the fact,
  especially when a cancel, retry, resume, or approval-follow-up path needs a
  small shareable report.
- The report draft is intentionally a side-chat draft first. It does not become
  a provider prompt until the user explicitly moves or dispatches it.
- Recent context improves workspace/file picker ergonomics, but it remains a
  metadata attachment surface. A future file-content picker must use a separate
  consent and redaction design.

## Live Claude Dogfood: 2026-06-24

Raw run output is local-only under `output/local/claude-live-dogfood/` and is not
tracked. This tracked record keeps only the safe operational summary.

- Smoke route: `claude --bare -p --model sonnet --permission-mode plan
  --output-format json --no-session-persistence` returned success with no stderr.
- Stream start: Claude Code rejected a non-UUID `--session-id` with
  `Invalid session ID. Must be a valid UUID.` This exposed a real live-runner
  bug: geond-agent must not pass workbench-local ids such as `local-session-1`
  as Claude session ids.
- Stream start retry: a UUID `--session-id` returned success and produced
  stream-json records with `system`, `user`, `assistant`, and `result` types.
- Resume: `--resume <uuid>` returned success and confirmed session continuity is
  sufficient for a resume-ready indicator when the external session id and run
  attempt metadata are present.
- Cancel: an intentionally terminated run exited with `143`, produced only an
  initial stream record, and no stderr. The UI should label this as a user/local
  cancellation rather than a provider failure.
- Retry: a fresh run after cancellation returned success. The UI should show a
  clean retry path with new attempt metadata, while preserving the cancelled
  attempt as evidence.

Follow-up implemented from the dogfood result:

- The Claude bridge now sends `--session-id` only for UUID-shaped Claude
  session ids and omits it for workbench-local ids.
- The native Tauri command boundary now rejects non-UUID `--session-id` and
  `--resume` values before launching Claude Code.
- Workspace report export and context favorites close the first pass of the
  evidence/report and picker ergonomics TODOs.
- The export panel now includes evidence bundle, issue report, workspace report,
  and export manifest actions, each preserving the metadata-only boundary.
- Export manifests make screenshot and structured trace collection explicit
  future evidence types instead of silently implying they already exist.
- Chunk budget monitoring moved from manual Vite warning inspection into the
  desktop build script.

## Live Claude Export Dogfood: 2026-06-24

Raw run output is local-only under
`output/local/claude-live-dogfood/export-panel-2026-06-24*` and is not tracked.
This tracked record keeps only safe operational findings.

- Smoke route with `--output-format json` reached Claude Code but returned
  `Invalid API key` with `is_error=true`. The key value was not printed.
- First stream-json attempt without `--verbose` failed before provider routing
  with `When using --print, --output-format=stream-json requires --verbose`.
  This confirms the app default should continue to include
  `--bare -p --verbose --output-format stream-json`.
- Verbose cancel probe exited `142` with no parsed stream records. This is a
  valid local cancellation shape for export/report review.
- Verbose retry and resume probes emitted parseable stream-json records
  (`system`, `assistant`, `result`) but the result carried API status `401`.
  The app should classify this as `provider_auth`, not as a generic runner
  failure or Z.ai model-quality verdict.
- The export panel is still useful in this blocked state: evidence bundle,
  issue report, workspace report, and export manifest can explain the failed
  route from metadata without raw Claude logs.
- Screenshot and structured trace evidence remained deferred. They require
  explicit consent plus redaction configuration before any future export can
  include captured visual or trace artifacts.

Follow-up implemented from the export dogfood result:

- The export manifest now includes a capture consent/redaction readiness section.
- The Files inspector shows a Capture boundary section for screenshot and
  structured trace bundles, both deferred until consent and redaction are ready.
- The tracked record separates provider auth failure from runner/process failure
  and keeps raw local outputs ignored.

## Verification Checklist

- `git diff --check`
- `pnpm --filter @geond-agent/desktop test`
- `pnpm --filter @geond-agent/desktop test:e2e`
- `cargo test --manifest-path apps/desktop/src-tauri/Cargo.toml`
- `pnpm verify`
- Diff secret/token/API key scan

## Remaining TODO

- Refresh the local Z.ai key or provider route and rerun a successful live
  Claude retry/resume dogfood; the current export dogfood is blocked at
  provider auth (`401`).
- Add explicit screenshot and structured trace capture/export after the consent
  and redaction boundaries are wired to a real capture command.
- Add a multi-session issue/report bundle once screenshots and structured traces
  exist.
- Continue workspace/file picker polish with favorites, recency, and workspace
  switcher integration.
