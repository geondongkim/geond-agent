# Repository Structure

`geond-agent` is intentionally split by product boundary instead of by
implementation detail.

```text
.
├── apps/
│   └── desktop/
│       ├── README.md
│       ├── package.json
│       ├── src/
│       └── tsconfig.json
├── packages/
│   ├── claude-code-bridge/
│   │   ├── README.md
│   │   ├── package.json
│   │   ├── src/
│   │   └── tsconfig.json
│   ├── ui-workbench/
│   │   ├── README.md
│   │   ├── package.json
│   │   ├── src/
│   │   │   ├── i18n/
│   │   │   ├── settings/
│   │   │   └── workbench/
│   │   └── tsconfig.json
│   └── zai-provider/
│       ├── README.md
│       ├── package.json
│       ├── src/
│       └── tsconfig.json
├── docs/
│   ├── adr/
│   ├── guides/
│   ├── plans/
│   └── reference/
├── .env.example
├── CONTRIBUTING.md
├── LICENSE
├── NOTICE
├── README.md
├── tsconfig.base.json
└── SECURITY.md
```

## Boundary Rules

### `apps/desktop`

Owns app shell, navigation, local workspace views, and the top-level workbench
composition. It should not own provider-specific credential or model-routing
logic.

### `packages/ui-workbench`

Owns reusable UI primitives and agent-workbench components. It should not call
model providers or spawn agent processes directly.

### `packages/claude-code-bridge`

Owns bridge behavior around Claude Code, ACP, session mapping, and process
lifecycle. It should stay independent from the desktop presentation layer.

### `packages/zai-provider`

Owns Z.ai provider configuration and model-routing helpers. It must not store
secrets or subscription/account state.

### `docs/reference`

Owns public-facing integration and licensing notes. Anything that affects
third-party boundaries should be documented here before code is imported.

### `docs/plans`

Owns evaluation plans, task queues, and scorecards for future paid-provider or
tool workflow decisions. Plans should not contain real secrets, tokens, or
provider account state.
