import { describe, expect, it } from "vitest";

import { createUiI18n, DEFAULT_WORKBENCH_SESSION_DEFAULTS } from "@geond-agent/ui-workbench";

import { createClaudeFirstRunChecklist } from "./first-run-checklist.js";

const i18n = createUiI18n("en");

describe("createClaudeFirstRunChecklist", () => {
  it("summarizes a Claude live route as ready when required metadata is present", () => {
    const checklist = createClaudeFirstRunChecklist({
      bridgeCommand: "claude --bare -p --verbose --output-format stream-json",
      claudeCliProbe: {
        state: "available",
        executable: "claude",
        version: "2.1.183",
        detail: "claude 2.1.183"
      },
      i18n,
      modelAliasOptions: [{ value: "sonnet", label: "sonnet alias", detail: "text, reasoning" }],
      persistenceNotes: ["SQLite stores normalized events only."],
      providerRouteOptions: [
        {
          value: "zai.anthropic-compatible",
          label: "Z.ai Anthropic-compatible",
          detail: "anthropic-compatible"
        }
      ],
      runnerMode: "claude-live",
      sessionDefaults: DEFAULT_WORKBENCH_SESSION_DEFAULTS
    });

    expect(checklist.level).toBe("ready");
    expect(checklist.items).toHaveLength(8);
  });

  it("keeps fixture mode visible as an attention item", () => {
    const checklist = createClaudeFirstRunChecklist({
      bridgeCommand: "claude --bare -p --verbose --output-format stream-json",
      i18n,
      modelAliasOptions: [{ value: "sonnet", label: "sonnet alias" }],
      persistenceNotes: ["SQLite stores normalized events only."],
      providerRouteOptions: [{ value: "zai.anthropic-compatible", label: "Z.ai route" }],
      runnerMode: "fixture",
      sessionDefaults: DEFAULT_WORKBENCH_SESSION_DEFAULTS
    });

    expect(checklist.level).toBe("attention");
    expect(checklist.items.find((item) => item.id === "runner-mode")).toMatchObject({
      level: "attention"
    });
  });

  it("marks missing bridge command and catalog entries as blocked", () => {
    const checklist = createClaudeFirstRunChecklist({
      bridgeCommand: " ",
      claudeCliProbe: {
        state: "available",
        executable: "claude",
        detail: "Claude Code CLI is available."
      },
      i18n,
      modelAliasOptions: [],
      persistenceNotes: [],
      providerRouteOptions: [],
      runnerMode: "claude-live",
      selectionReadiness: undefined,
      sessionDefaults: DEFAULT_WORKBENCH_SESSION_DEFAULTS
    });

    expect(checklist.level).toBe("blocked");
    expect(checklist.items.filter((item) => item.level === "blocked").map((item) => item.id)).toEqual([
      "bridge-command",
      "provider-route",
      "model-profile"
    ]);
  });

  it("blocks live first-run readiness when the Claude CLI probe is missing", () => {
    const checklist = createClaudeFirstRunChecklist({
      bridgeCommand: "claude --bare -p --verbose --output-format stream-json",
      claudeCliProbe: {
        state: "missing",
        executable: "claude",
        detail: "No such file or directory"
      },
      i18n,
      modelAliasOptions: [{ value: "sonnet", label: "sonnet alias" }],
      persistenceNotes: ["SQLite stores normalized events only."],
      providerRouteOptions: [{ value: "zai.anthropic-compatible", label: "Z.ai route" }],
      runnerMode: "claude-live",
      sessionDefaults: DEFAULT_WORKBENCH_SESSION_DEFAULTS
    });

    expect(checklist.level).toBe("blocked");
    expect(checklist.items.find((item) => item.id === "cli-probe")).toMatchObject({
      level: "blocked",
      value: "Missing from PATH"
    });
  });

  it("uses active selection readiness when provider route metadata is blocked", () => {
    const checklist = createClaudeFirstRunChecklist({
      bridgeCommand: "claude --bare -p --verbose --output-format stream-json",
      claudeCliProbe: {
        state: "available",
        executable: "claude",
        detail: "Claude Code CLI is available."
      },
      i18n,
      modelAliasOptions: [{ value: "sonnet", label: "sonnet alias" }],
      persistenceNotes: ["SQLite stores normalized events only."],
      providerRouteOptions: [{ value: "zai.anthropic-compatible", label: "Z.ai route" }],
      runnerMode: "claude-live",
      selectionReadiness: {
        level: "blocked",
        summary: "Provider route is blocked.",
        items: [
          {
            id: "provider-route",
            label: "Z.ai route",
            level: "blocked",
            reason: "API key presence is missing in local runtime metadata."
          }
        ]
      },
      sessionDefaults: DEFAULT_WORKBENCH_SESSION_DEFAULTS
    });

    expect(checklist.level).toBe("blocked");
    expect(checklist.items.find((item) => item.id === "provider-route")).toMatchObject({
      level: "blocked",
      detail: "API key presence is missing in local runtime metadata."
    });
  });
});
