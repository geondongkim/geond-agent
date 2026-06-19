# Licensing Policy

`geond-agent` is licensed under Apache License 2.0.

This license was chosen because the project may integrate with or learn from
Apache-2.0 projects such as Goose, ACP, and Cline. Apache-2.0 also provides an
explicit patent grant, which is useful for an agent platform that may grow over
time.

## Current Repository State

The repository currently contains original project scaffolding and
documentation. It does not vendor third-party application source code.

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

If a future change copies code from any source-available or proprietary project,
stop and review the license before merging.

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

## Claude Code Boundary

Claude Code should be treated as an external user-installed dependency. The
bridge package may launch or communicate with it through documented interfaces,
but should not copy Claude Code internals or redistribute Claude Code binaries.

## Z.ai Boundary

Z.ai credentials and subscription state must remain outside the repository.
Provider helpers may document endpoints and model aliases, but must not include
real keys or user account data.
