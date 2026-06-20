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
Empty or whitespace-only environment values are treated as missing.

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
