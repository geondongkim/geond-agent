import { describe, expect, it } from "vitest";

import {
  findAdvisoryProviderRouteFallback,
  findCurrentProviderRouteOption,
  shouldOfferProviderRouteFallback
} from "./provider-route-advisory.js";

describe("provider route advisory fallback", () => {
  it("prefers OpenAI-compatible routes for retryable provider incidents", () => {
    const fallback = findAdvisoryProviderRouteFallback({
      issue: {
        id: "issue-1",
        kind: "provider_overloaded",
        severity: "error",
        title: "Provider overloaded",
        message: "HTTP 529",
        retryable: true,
        suggestedAction: "retry_later",
        providerRouteId: "zai.anthropic-compatible"
      },
      providerRouteOptions: [
        {
          value: "zai.anthropic-compatible",
          label: "Z.ai Anthropic-compatible route",
          detail: "anthropic-compatible"
        },
        {
          value: "zai.openai-compatible-coding",
          label: "Z.ai OpenAI-compatible coding route",
          detail: "openai-compatible"
        }
      ]
    });

    expect(fallback).toMatchObject({
      value: "zai.openai-compatible-coding",
      detail: "openai-compatible"
    });
  });

  it("does not offer route switching for auth failures", () => {
    expect(
      shouldOfferProviderRouteFallback({
        id: "issue-auth",
        kind: "provider_auth",
        severity: "error",
        title: "Provider auth issue",
        message: "401",
        retryable: false,
        suggestedAction: "check_key",
        providerRouteId: "zai.anthropic-compatible"
      })
    ).toBe(false);
  });

  it("finds the current route label for review UI copy", () => {
    expect(
      findCurrentProviderRouteOption(
        [
          {
            value: "zai.openai-compatible-coding",
            label: "Z.ai OpenAI-compatible coding route",
            detail: "openai-compatible"
          }
        ],
        "zai.openai-compatible-coding"
      )?.label
    ).toBe("Z.ai OpenAI-compatible coding route");
  });
});
