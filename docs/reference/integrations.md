# Integration Notes

This project references multiple agent tools and protocols. References do not
mean that their code is included in this repository.

## Goose

Goose is a native open-source AI agent with desktop, CLI, and API surfaces. It is
the closest reference for the desktop-first local agent direction.

Potential use:

- UI and desktop workflow reference,
- ACP/MCP integration reference,
- possible fork or upstream contribution target.

If Goose code is copied or forked, preserve its Apache-2.0 license and notices.

## Agent Client Protocol

ACP is the preferred boundary between frontend workbench and agent backend.

Potential use:

- agent backend abstraction,
- Claude Code bridge,
- future support for other ACP-compatible agents.

## Claude Code

Claude Code is treated as an external installed tool and backend process.

Allowed project direction:

- launch or communicate through documented CLI/process/protocol behavior,
- map sessions at the bridge layer,
- document setup and operational caveats.

Avoid:

- copying proprietary internals,
- bundling Claude Code,
- bypassing auth, quota, or provider terms.

## Z.ai GLM Coding Plan

Z.ai is treated as an external model provider. The planned project role is
provider configuration and model routing, not key management or quota bypassing.

Potential routing:

- `glm-4.7` for ordinary coding loops,
- `glm-5.2` for hard reasoning, refactors, and stuck states.

## Cline, Kilo Code, OpenHands, OpenCode, Factory

These projects are useful references for UX patterns such as plan/act modes,
diff review, session management, and agent workflow surfaces.

Do not copy code or assets from any project without first checking its license
and preserving required notices.
