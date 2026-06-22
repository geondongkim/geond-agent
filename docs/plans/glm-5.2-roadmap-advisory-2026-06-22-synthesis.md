# GLM 5.2 Roadmap Advisory Synthesis - 2026-06-22

This synthesis records the controller evaluation of four GLM 5.2 advisories
requested on 2026-06-22. Claude Code was routed through the Z.ai `opus` alias
for architecture and roadmap advice only. No implementation was delegated to
GLM 5.2, and raw JSON outputs remain local under `/tmp`.

## Advisory Set

- [Claude Code Deepening](./glm-5.2-roadmap-advisory-2026-06-22-01-claude-code-deepening.md)
- [Persistence Materialization](./glm-5.2-roadmap-advisory-2026-06-22-02-persistence-materialization.md)
- [Horizontal Expansion](./glm-5.2-roadmap-advisory-2026-06-22-03-horizontal-expansion.md)
- [Model and Provider Intelligence](./glm-5.2-roadmap-advisory-2026-06-22-04-model-provider-intelligence.md)

## Combined Read

The four advisories converge on a conservative product sequence:

1. Deepen the Claude Code route through print-mode follow-up and resume.
2. Make approval state durable through versioned SQLite migrations and an
   approvals materialized table.
3. Prove horizontal expansion with an OpenCode fixture-replay adapter, not a
   live runner.
4. Add model-choice intelligence metadata before any auto-routing policy.

This sequence keeps the project aligned with the current product decision:
Claude Code is the first implementation route, while the workbench remains
adapter-neutral and provider/model selection stays separate from backend
execution.

## Recommended PR Order

### PR A - Claude Print-Mode Follow-Up Loop

Best when the immediate goal is user-visible Claude workflow quality.

- Add resumed follow-up command construction.
- Use external adapter session ids, not workbench ids, for Claude resume.
- Re-run after local approval review instead of attempting stdin forwarding.
- Preserve ask-first defaults and avoid persisted `bypassPermissions`.

### PR B - Versioned Approvals Persistence

Best when the immediate goal is storage correctness and review-state durability.

- Add schema versioning.
- Make append/materialization transactional.
- Add `workbench_approvals`.
- Derive approval rail counts from the table.

This PR is the strongest foundation slice and should land no later than the
Claude follow-up loop because both features rely on trustworthy approval state.

### PR C - OpenCode Fixture Adapter

Best when the immediate goal is demonstrating that the backend picker is real.

- Add `packages/opencode-bridge`.
- Add fixture replay and adapter metadata only.
- Keep live execution deferred.
- Leave Cline for a later comparison route.

### PR D - Model Choice Intelligence

Best when the immediate goal is making manual model selection clearer.

- Add cost/task/context metadata.
- Add localized model-choice explanations.
- Keep auto routing and quota/account-state introspection deferred.

## Controller Decision

The next implementation push should prefer **PR B or PR A**:

- choose PR A if the next slice is about Claude Code workflow continuity,
- choose PR B if the next slice is about durable workbench correctness.

Given the current codebase already has live Claude execution, session resume,
approval review, and a durable session index, the safest default next step is
**PR B: versioned approvals persistence**. It reduces fragility beneath both
Claude follow-up and future review UX without broadening the product surface.

After that, implement PR A, then PR C, then PR D unless model selection UX
becomes the nearer user need.

## Guardrails

All four advisories preserve the existing constraints:

- no GitHub Copilot SDK dependency,
- no provider calls outside the existing external process boundary,
- no API key, token, raw Claude log, or provider account state storage,
- no copied Claude Code, OpenCode, Cline, Goose, or OpenHands source code,
- no absorption of the separate `geond-agent-protocol` repo.
