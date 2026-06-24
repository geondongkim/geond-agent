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

## Live Claude Route Refresh Dogfood: 2026-06-24

Raw run output is local-only under
`output/local/claude-live-dogfood/route-refresh-settings-2026-06-24b/` and is
not tracked. This tracked record keeps only safe operational findings.

- Reusing shell env alone still returned provider auth `401`.
- Following the Z.ai Claude Code setup shape with a local Claude settings file
  that provides `ANTHROPIC_AUTH_TOKEN`, `ANTHROPIC_BASE_URL`, timeout,
  nonessential-traffic disablement, compact-window, and model alias metadata
  returned successful smoke, retry, and resume probes.
- The successful smoke result returned `type=result`, `subtype=success`,
  `is_error=false`, and a session id without exposing the key.
- The successful retry stream produced parseable stream-json records across
  `system`, `stream_event`, `assistant`, `user`, and `result` shapes with no
  API error status.
- The successful resume probe against the same external session id returned a
  parseable `result` record and confirmed route continuity after refresh.
- Product conclusion: geond-agent should keep `ZAI_API_KEY` as the local
  operator-facing secret name, derive process-local `ANTHROPIC_AUTH_TOKEN` only
  inside the native runner, inject an ephemeral Claude `--settings` file, and
  delete it after the process exits.

Follow-up implemented from the route refresh result:

- The native Claude runner now maps local `ZAI_API_KEY` to
  `ANTHROPIC_AUTH_TOKEN`, applies Z.ai Claude Code defaults, injects an
  ephemeral `--settings` file, and excludes `ZAI_API_KEY` from the child/settings
  environment.
- The Z.ai provider helper treats either `ZAI_API_KEY` or
  `ANTHROPIC_AUTH_TOKEN` as credential-present metadata without returning the
  credential value.
- Claude bridge redaction fixtures explicitly cover `ANTHROPIC_AUTH_TOKEN`.
- After implementing the native settings injection boundary, a fresh local
  probe under
  `output/local/claude-live-dogfood/route-refresh-implemented-20260624-111400/`
  returned smoke/retry/resume exit `0`. The retry stream parsed 167 records and
  the resume stream parsed 106 records with no API error status.

## Evidence Capture Command Boundary: 2026-06-24

- The native app exposes `write_evidence_capture_artifact` for explicit,
  user-selected capture artifact paths.
- Supported artifact kinds are `screenshot-manifest` and `structured-trace`.
- The command enforces a metadata cap and rejects unsupported raw capture kinds.
- The Files inspector now exports a screenshot manifest and a structured trace
  JSON artifact through the same Tauri save-dialog/browser-download split as
  the existing evidence package.
- Screenshot manifests do not include bitmap data. Structured traces include
  metadata-only session, selection, count, diff path/stat, latest run attempt,
  and capture-policy evidence.
- The Files inspector now also exports a multi-session trace bundle and a
  visual capture policy artifact. The trace bundle groups session index,
  attention counts, route metadata, and active-session trace metadata without
  raw logs. The visual policy records the explicit consent/redaction
  requirements that must be satisfied before any future raw visual artifact is
  captured.
- A multi-session issue report can be queued as a side-chat draft or exported as
  markdown when several sessions need one local review bundle.
- Multi-session report and trace exports now use a visible session export scope
  checklist. The default includes all projected sessions, and the user can
  switch to attention sessions or toggle individual sessions before exporting.
- Raw visual capture remains disabled, but the Files inspector now has a
  visual capture review checklist for explicit consent, redaction review,
  user-selected storage path readiness, and visible-content review. The checked
  state is recorded in the visual capture policy artifact.

## Product-Level Dogfood Workflow: 2026-06-24

- Route health now offers manual advisory route switching from both runner issue
  cards and provider route health cards. This changes the next-run default
  provider route only; geond-agent still does not auto-switch providers.
- A shared dogfood workflow summary rolls up selected sessions, attention
  sessions, live run successes/failures/cancellations, retryable issues, route
  switch candidates, route health counts, and visual policy readiness.
- The Files inspector shows that dogfood summary next to the multi-session
  export scope so the user can decide whether to retry/resume, switch route,
  queue a multi-session report, or complete visual policy review before export.
- Workspace report, multi-session issue report, export manifest, structured
  trace, multi-session trace bundle, and visual capture policy artifacts all
  include the same metadata-only dogfood summary.
- The visual capture policy now records missing consent/redaction checklist
  steps explicitly while keeping raw image capture disabled.
- The local-only evidence boundary is unchanged: raw Claude logs, provider
  keys, private file contents, local session files, and visual payloads are not
  persisted into normalized workbench artifacts.

## Verification Checklist

- `git diff --check`
- `pnpm --filter @geond-agent/desktop test`
- `pnpm --filter @geond-agent/desktop test:e2e`
- `cargo test --manifest-path apps/desktop/src-tauri/Cargo.toml`
- `pnpm verify`
- Diff secret/token/API key scan

## Remaining TODO

- Add true raw visual capture only after a dedicated implementation can enforce
  the reviewed consent/redaction checklist and write to a user-selected path.
- Run more live Claude dogfood sessions with successful route switch, retry,
  cancel, and resume paths so the workflow summary can be tuned against real
  operator behavior.
- Add deeper issue/report export packaging if multi-session reports need to be
  bundled with multiple per-session structured trace artifacts in one action.
