import { describe, expect, it } from "vitest";

import { createUiI18n, type WorkbenchSelectionSnapshot } from "@geond-agent/ui-workbench";

import { formatLiveRunReadinessBlockMessage } from "./live-run-readiness.js";

describe("desktop live run readiness guard", () => {
  it("formats a launch-blocking readiness message with non-ready details", () => {
    expect(formatLiveRunReadinessBlockMessage(createBlockedSelection(), createUiI18n("en"))).toBe(
      "Claude Code live run is blocked before process launch: 1 readiness blocker must be resolved before live execution. | Z.ai route: Z.ai route API key presence is missing in local runtime metadata."
    );
  });

  it("uses the active UI language for the launch-blocked prefix", () => {
    expect(formatLiveRunReadinessBlockMessage(createBlockedSelection(), createUiI18n("ko"))).toBe(
      "프로세스 시작 전 Claude Code live 실행이 차단되었습니다: 1 readiness blocker must be resolved before live execution. | Z.ai route: Z.ai route API key presence is missing in local runtime metadata."
    );
  });

  it("allows live runs when readiness is not blocked", () => {
    expect(
      formatLiveRunReadinessBlockMessage(
        {
          ...createBlockedSelection(),
          readiness: {
            level: "attention",
            summary: "1 readiness item needs attention before this route is considered stable.",
            items: [
              {
                id: "backend-adapter",
                label: "Claude Code",
                level: "attention",
                reason: "Diff capability has not been evaluated yet."
              }
            ]
          }
        },
        createUiI18n("en")
      )
    ).toBeUndefined();
  });
});

function createBlockedSelection(): WorkbenchSelectionSnapshot {
  return {
    backendAdapterId: "claude-code.external-cli-acp",
    providerRouteId: "zai.anthropic-compatible",
    modelProfileId: "opus",
    routingMode: "manual",
    readiness: {
      level: "blocked",
      summary: "1 readiness blocker must be resolved before live execution.",
      items: [
        {
          id: "provider-route",
          label: "Z.ai route",
          level: "blocked",
          reason: "Z.ai route API key presence is missing in local runtime metadata."
        },
        {
          id: "routing-mode",
          label: "Manual routing",
          level: "ready"
        }
      ]
    }
  };
}
