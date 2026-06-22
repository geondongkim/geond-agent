import { createUiI18n } from "@geond-agent/ui-workbench";
import { describe, expect, it } from "vitest";

import {
  createRunnerEvidencePromptSection,
  createRunnerPrompt
} from "./runner-prompt.js";
import type { ProjectedActiveSession } from "../lib/workbench-types.js";

describe("runner prompt evidence context", () => {
  it("appends metadata-only context and diff evidence to explicit prompts", () => {
    const prompt = createRunnerPrompt("claude-live", "Fix the selected bug.", createUiI18n("en"), {
      activeSession: createActiveSession()
    });

    expect(prompt).toContain("Fix the selected bug.");
    expect(prompt).toContain(
      "Workbench evidence context (metadata only; raw private file contents are not attached):"
    );
    expect(prompt).toContain("Context [file] app.tsx");
    expect(prompt).toContain("path: apps/desktop/src/app.tsx");
    expect(prompt).toContain("state: metadata-only");
    expect(prompt).toContain("Diff Desktop polish");
    expect(prompt).toContain("file: apps/desktop/src/panes/inspector.tsx");
    expect(prompt).not.toContain("actual private file body");
  });

  it("keeps fallback prompts usable when no evidence is selected", () => {
    const prompt = createRunnerPrompt("fixture", "   ", createUiI18n("en"));

    expect(prompt).toBe("Review the current workspace and continue the implementation.");
  });

  it("limits evidence lines before dispatching to a backend", () => {
    const section = createRunnerEvidencePromptSection({
      activeSession: createActiveSession(),
      maxEvidenceItems: 1
    });

    expect(section?.split("\n")).toHaveLength(2);
    expect(section).toContain("Context [file] app.tsx");
    expect(section).not.toContain("Diff Desktop polish");
  });
});

function createActiveSession(): ProjectedActiveSession {
  return {
    contextAttachments: [
      {
        id: "context-app",
        kind: "file",
        title: "app.tsx",
        provenance: "desktop",
        contentState: "metadata-only",
        path: "apps/desktop/src/app.tsx",
        range: { startLine: 10, endLine: 20 },
        summary: "Selected metadata for the app shell."
      }
    ],
    diffs: [
      {
        id: "diff-1",
        title: "Desktop polish",
        summary: "Updated the inspector panel.",
        files: [
          {
            path: "apps/desktop/src/panes/inspector.tsx",
            changeKind: "modified",
            additions: 18,
            deletions: 4
          }
        ]
      }
    ]
  } as unknown as ProjectedActiveSession;
}
