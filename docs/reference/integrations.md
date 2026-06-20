# Integration Notes

This project references multiple agent tools and protocols. References do not
mean that their code is included in this repository.

## Integration Posture

`geond-agent` is a horizontal local agent workbench. It may connect to multiple
agent backends, tools, and providers through adapter boundaries. Tool references
in this document are interoperability targets, not vendored dependencies.

Current categories:

- first bridge target: Claude Code,
- candidate integration surfaces: Goose, Cline, OpenCode, OpenHands, Kilo Code,
  and other ACP-compatible or CLI/plugin-mediated tools,
- provider/model routing target: Z.ai GLM Coding Plan.

No third-party source code should be imported before license review and notice
requirements are documented.

## Goose

Goose is a native open-source AI agent with desktop, CLI, and API surfaces. It is
the closest reference for the desktop-first local agent direction.

Potential use:

- UI and desktop workflow reference,
- ACP/MCP integration reference,
- possible fork or upstream contribution target.

If Goose code is copied or forked, preserve its Apache-2.0 license and notices.
Until that happens, treat Goose as a reference and candidate integration surface,
not as vendored source.

## Agent Client Protocol

ACP is a preferred boundary between the frontend workbench and agent backends.

Potential use:

- agent backend abstraction,
- Claude Code bridge,
- future support for other ACP-compatible agents.

## Claude Code

Claude Code is the first bridge target. It is treated as an external installed
tool and backend process.

Allowed project direction:

- launch or communicate through documented CLI/process/protocol behavior,
- map sessions at the bridge layer,
- document setup and operational caveats.

Avoid:

- copying proprietary internals,
- bundling Claude Code,
- bypassing auth, quota, or provider terms.

Claude Code evaluation results should not become a verdict on the whole
workbench architecture. If the Claude Code path is limited, evaluate other
candidate surfaces before changing the horizontal adapter strategy.

## Z.ai GLM Coding Plan

Z.ai is treated as an external model provider. The planned project role is
provider configuration and model routing, not key management or quota bypassing.

Potential routing:

- `glm-4.7` for ordinary coding loops,
- `glm-5.2` for hard reasoning, refactors, and stuck states.

Z.ai should be evaluated separately from any single agent tool. Compare Claude
Code, Cline, OpenCode, or other supported routes before deciding whether Z.ai is
or is not useful for `geond-agent`.

## Candidate Integration Surfaces

| Tool or surface | Current approach | Notes |
| --- | --- | --- |
| Claude Code | External process, documented CLI/process/protocol behavior | First bridge target. No bundled code. |
| Goose | Documented API/protocol and UX reference | Candidate ACP/MCP and desktop workflow reference. No vendored code unless license/notice work is complete. |
| Cline | IDE/plugin mediated backend and setup guide reference | Candidate evaluation route for Z.ai and plan/act UX comparison. Local extension settings stay outside the repo. |
| OpenCode | External CLI/workbench process and setup guide reference | Candidate evaluation route for terminal-oriented workflows. No vendored code. |
| OpenHands | Documented API/protocol or external process reference | Candidate workflow and agent surface reference. No vendored code. |
| Kilo Code | IDE/plugin mediated backend and UX reference | Candidate review and planning workflow reference. No vendored code. |
| Other ACP-compatible backends | Documented protocol adapter | Candidate backend adapter packages may be added later. |

Do not copy code or assets from any project without first checking its license,
preserving required notices, and updating `docs/reference/licensing.md` and
`NOTICE` when required.
