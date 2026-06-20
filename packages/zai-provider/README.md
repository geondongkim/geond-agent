# Z.ai Provider

Provider helpers for Z.ai GLM Coding Plan routing.

## Responsibility

- Document GLM Coding Plan endpoint choices.
- Centralize model mapping for `glm-4.7`, `glm-5.2`, `glm-5-turbo`, and the
  future `auto` profile.
- Keep subscription-safe configuration separate from general API usage.
- Avoid storing API keys in source-controlled files.

## Initial Routing Policy

```text
ordinary coding loops -> glm-4.7
hard reasoning tasks  -> glm-5.2
```

Real API keys and subscription/account state must stay outside the repository.

## Current API Boundary

```ts
import {
  createZaiAnthropicCompatibleEnvironment,
  createZaiProviderConfig
} from "@geond-agent/zai-provider";

const config = createZaiProviderConfig(process.env);
const env = createZaiAnthropicCompatibleEnvironment(config);
```

The helper returns endpoint/model environment values only. It reports key
presence through `hasApiKey`, but it does not expose or persist key values.

Empty or whitespace-only values for `ANTHROPIC_BASE_URL`, the
`ANTHROPIC_DEFAULT_HAIKU_MODEL`, `ANTHROPIC_DEFAULT_SONNET_MODEL`, and
`ANTHROPIC_DEFAULT_OPUS_MODEL` aliases, and `ZAI_API_KEY` are treated as
missing. The default endpoint and model routing therefore stay stable, and
`hasApiKey` stays `false` until a non-empty key is present.

The package also exposes a pre-subscription model catalog and route metadata:

```ts
import {
  createZaiProviderConfig,
  getZaiModelProfile
} from "@geond-agent/zai-provider";

const config = createZaiProviderConfig(process.env);
const hardTaskModel = getZaiModelProfile(config.routing.hard);
```

The catalog is metadata only. It does not call Z.ai, verify subscription state,
or store account/session data.

Route metadata includes both the Anthropic-compatible endpoint for Claude
Code/Goose-style paths and the OpenAI-compatible coding endpoint for tools such
as Cline/OpenCode. Choose the endpoint expected by the target tool before a paid
evaluation run.
