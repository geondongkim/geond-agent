# GLM 5.2 Roadmap Advisory - Model and Provider Intelligence

This note records the fourth of four GLM 5.2 advisories requested on
2026-06-22. Claude Code was routed through the Z.ai `opus` alias and asked to
review model/provider intelligence work before recommending a PR direction.

The raw JSON response remains local under `/tmp` and is not committed.

## Scope

The advisory reviewed the current Z.ai provider catalog, backend/model selection
roadmap, manual routing model, usage metadata, settings surface, and long-term
auto-routing goals.

No secret values were requested, printed, or committed.

## Recommendation

GLM 5.2 recommended implementing **model selection intelligence metadata**
before auto routing, quota/account state, or broader provider registry work.

The proposed slice combines:

- model cost-tier metadata,
- task-class recommendations,
- context-window/output metadata,
- latency or reliability hints,
- a `describeModelChoice()` explanation helper,
- UI surfacing in the selection inspector and settings picker.

## Rationale

The current manual model picker already works, but it does not explain why a
model is appropriate. Auto routing would need the same metadata before it can
make useful decisions.

The advisory recommends keeping this work metadata-only because it is:

- additive,
- secret-safe,
- directly useful for manual routing,
- a prerequisite for later auto routing,
- compatible with the existing UI language and agent response language split.

## Architecture Slice

The proposed PR should add optional metadata to model profiles, such as:

- `costTier`,
- `recommendedTaskClass`,
- `contextWindowTokens`,
- `maxOutputTokens`,
- `latencyClass`,
- capability explanation labels.

It should also add a UI-owned explanation helper rather than embedding
workbench copy inside the Z.ai provider package. The provider package should
continue to expose metadata, while `packages/ui-workbench` turns that metadata
into localized user-facing explanations.

## PR Direction

Recommended PR:

**Add model choice metadata and localized explanation helpers.**

Acceptance criteria for that PR should include:

- Z.ai model profiles expose richer metadata for `glm-4.7`, `glm-5.2`,
  `glm-5-turbo`, and `auto`,
- manual model picker and selection inspector can explain the chosen model,
- English/Korean labels are present for the new explanation fields,
- no provider calls are added,
- no API key, quota, or account-state data is stored.

## Deferred

- auto routing policy,
- quota/account-state introspection,
- new provider dependencies,
- evaluation score aggregation,
- pure visual picker redesign without new metadata.

## Controller Evaluation

This is a good medium-sized PR once the core Claude/persistence path is less
fragile. It improves daily model selection and lays the input layer for future
auto routing without crossing the secret/account-state boundary.

It can be implemented independently of OpenCode expansion, but it should not
displace the near-term Claude follow-up and approval persistence work.
