# Licensing Policy

`geond-agent` is licensed under Mozilla Public License 2.0 (MPL-2.0).

MPL-2.0 was chosen to keep the core workbench source open and reciprocal while
still allowing adapter, protocol, and integration ecosystems to grow around it.
MPL-2.0 is a file-level copyleft license: modifications to MPL-covered source
files must remain available under MPL-2.0, while larger works can combine those
files with separately licensed files when the MPL requirements are preserved.

Earlier revisions that were published under Apache-2.0 remain available under
the license terms that applied to those revisions. New repository changes should
use the MPL-2.0 repository license unless a subproject explicitly declares a
different license.

## Current Repository State

The repository currently contains original project scaffolding and
documentation. It does not vendor third-party application source code. OSS
agent workbench repositories may be cloned locally for research, but those
clones are not part of this repository and must not be committed.

## Third-Party References

Third-party names are mentioned only for interoperability and research:

- Goose
- Agent Client Protocol
- Claude Code
- Z.ai / GLM Coding Plan
- Cline
- Kilo Code
- OpenHands
- OpenCode
- Factory
- GitHub Copilot
- OpenAI Codex

Those names may be trademarks of their owners. This project is independent and
not endorsed by those projects or companies.

## Known Upstream License Posture

These entries are references for future integration work. They do not imply that
their code is currently included in this repository.

| Project | Current use in this repo | License posture to preserve if code is imported |
| --- | --- | --- |
| Goose | Desktop/agent UX and ACP/MCP reference | Apache-2.0 |
| Agent Client Protocol | Protocol boundary reference | Apache-2.0 |
| Claude Agent ACP adapter | Bridge reference | Apache-2.0 |
| Cline | Plan/act and review UX reference | Apache-2.0 |
| Claude Code | External installed tool only | Proprietary/external product boundary |
| Z.ai GLM Coding Plan | External provider only | External service/API terms |
| OpenCode | Provider/model picker, ACP session, permission prompt reference | MIT |
| OpenHands | LLM profiles, settings/secrets, metrics, security indicator reference | MIT outside `enterprise/`; `enterprise/` is PolyForm Free Trial and excluded |
| OpenAI Codex | Event-driven UI, exec policy, approval overlay, snapshot TUI reference | Apache-2.0 |
| GitHub Copilot app/Chat/SDK | Product pattern and future integration research only | GitHub terms; no dependency or source import |

If a future change copies code from any source-available or proprietary project,
stop and review the license before merging.

## OSS Research Snapshot

The following repositories were cloned outside the worktree for design research.
This table records the investigated commits and license posture. It does not
authorize source import.

| Project | Investigated commit | License posture | Use allowed in current repo |
| --- | --- | --- | --- |
| Goose | `6c2ec554de1632636d484e4124fbb3c011105342` | Apache-2.0 | Design-pattern notes only |
| Cline | `ee59f81706981e0a64c8b32f8f0415c9d39561fa` | Apache-2.0 | Design-pattern notes only |
| OpenCode | `009f3799cd6d28cad5a3e1b3902a80f60f93122e` | MIT | Design-pattern notes only |
| OpenHands | `7b228db6ae143598b4caf65c6f7ed759b511f922` | MIT outside `enterprise/`; PolyForm Free Trial under `enterprise/` | Only non-enterprise design patterns; no `enterprise/` reuse |
| OpenAI Codex | `d66708232299bdbf373ec55b0d6b938c246cfa60` | Apache-2.0 | Design-pattern notes only |

## Rules for Adding Third-Party Code

Before copying, vendoring, or forking third-party code:

1. Confirm the license.
2. Preserve the original license file.
3. Preserve required copyright notices.
4. Preserve or update `NOTICE` when required.
5. Mark modified files when the license requires it.
6. Avoid copying proprietary code, private assets, generated bundles, or code
   covered by terms that do not allow redistribution.

## Practical Guidance

- Apache-2.0 code can generally be incorporated when license and notice
  requirements are preserved.
- MPL-2.0 code can generally be incorporated when file-level copyleft,
  source-availability, and notice requirements are preserved.
- MIT/BSD-style code can generally be incorporated with attribution and license
  preservation.
- Source-available licenses may restrict competitive use or redistribution;
  review them before use.
- Proprietary tools should stay behind CLI, API, or protocol boundaries unless
  their license explicitly allows deeper integration.
- PolyForm-licensed code must be treated as restricted until a project-specific
  legal review allows a narrower use. OpenHands `enterprise/` is in this
  category.
- Research notes may summarize architecture and UX patterns, but should not
  include copied implementation text, generated bundles, assets, or test
  fixtures from upstream projects.

## Workbench UI First Slice Dependency Posture

The first desktop workbench UI slice adds package-managed third-party
dependencies for the local shell, renderer, styling, testing, and small UI
primitives. Current examples include React, React DOM, Vite, Tailwind CSS,
PostCSS, Autoprefixer, Radix Tabs, Tauri API/CLI, Tauri dialog plugin
bindings/crates, `lucide-react`, `clsx`, `tailwind-merge`, Vitest, TypeScript,
and `@types/*` packages, plus the Tauri Rust/crates.io dependencies used by
`apps/desktop/src-tauri`. The raw visual PNG export path directly uses the
macOS `/usr/sbin/screencapture` tool through a Tauri command for the current
native capture bridge, and keeps the `base64` Rust crate only for the
backward-compatible PNG writer test/helper path before native signature and
size validation.

These dependencies are consumed as npm/pnpm packages or Rust crates. Their
source is not copied into this repository as vendored app code, and upstream
desktop application source or generated bundles are not committed as part of
this slice. Dependency versions and transitive license metadata are tracked
through `package.json`, `pnpm-lock.yaml`, and the Rust/Tauri manifest files
rather than by importing upstream project trees.

The expected posture for these dependencies is standard permissive OSS licensing
such as MIT or Apache-2.0/MIT-family terms. If a future change requires copying,
vendoring, or forking third-party UI/runtime source instead of consuming the
published package/crate, that change must go back through the repository
license-review rules above before merge.

## Backend Adapter SDK and Examples

`packages/backend-adapter-sdk`, `packages/codex-cli-bridge`, and
`examples/adapters/mock-backend` are original repository code and currently
inherit the repository MPL-2.0 license. The SDK is designed as a neutral adapter
authoring contract inside this monorepo; it is not `geond-agent-protocol`, and
it does not include third-party adapter source.

`packages/codex-cli-bridge` is metadata-only. It does not import, vendor, or
copy OpenAI Codex source, app assets, VS Code extension bundles, screenshots,
fonts, fixtures, or local session state. If a future PR imports code from
`openai/codex`, preserve Apache-2.0 license text and notices before merging.

Future distribution may choose to publish adapter SDK/types/examples under a
separate license or package boundary if external adapter authorship becomes a
primary ecosystem goal. Until such a decision is recorded, new SDK and example
files should follow the repository MPL-2.0 license and must not copy Claude
Code, Cline, OpenCode, Goose, or other third-party implementation code.

## Claude Code Boundary

Claude Code should be treated as an external user-installed dependency. The
bridge package may launch or communicate with it through documented interfaces,
but should not copy Claude Code internals or redistribute Claude Code binaries.

## Z.ai Boundary

Z.ai credentials and subscription state must remain outside the repository.
Provider helpers may document endpoints and model aliases, but must not include
real keys or user account data.
