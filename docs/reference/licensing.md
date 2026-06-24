# Licensing Policy

`geond-agent` is licensed under Apache License 2.0.

This license was chosen because the project may integrate with or learn from
Apache-2.0 projects such as Goose, ACP, and Cline. Apache-2.0 also provides an
explicit patent grant, which is useful for an agent platform that may grow over
time.

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
`base64` Rust crate to decode renderer-captured PNG payloads before native
signature and size validation.

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

## Claude Code Boundary

Claude Code should be treated as an external user-installed dependency. The
bridge package may launch or communicate with it through documented interfaces,
but should not copy Claude Code internals or redistribute Claude Code binaries.

## Z.ai Boundary

Z.ai credentials and subscription state must remain outside the repository.
Provider helpers may document endpoints and model aliases, but must not include
real keys or user account data.
