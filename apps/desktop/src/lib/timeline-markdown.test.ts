import { describe, expect, it } from "vitest";

import { parseTimelineMarkdown } from "./timeline-markdown.js";

describe("parseTimelineMarkdown", () => {
  it("parses headings, paragraphs, lists, and fenced code blocks", () => {
    expect(
      parseTimelineMarkdown(
        [
          "## Plan",
          "",
          "Review the workspace before editing.",
          "",
          "- Read docs",
          "- Run tests",
          "",
          "```ts",
          "const ok = true;",
          "```"
        ].join("\n")
      )
    ).toEqual([
      { type: "heading", level: 2, text: "Plan" },
      { type: "paragraph", text: "Review the workspace before editing." },
      { type: "list", ordered: false, items: ["Read docs", "Run tests"] },
      { type: "code", language: "ts", text: "const ok = true;" }
    ]);
  });

  it("keeps ordered and unordered lists separate", () => {
    expect(
      parseTimelineMarkdown(
        ["1. Inspect state", "2. Patch UI", "- Verify", "- Push"].join("\n")
      )
    ).toEqual([
      { type: "list", ordered: true, items: ["Inspect state", "Patch UI"] },
      { type: "list", ordered: false, items: ["Verify", "Push"] }
    ]);
  });

  it("closes unterminated fenced code blocks at the end of input", () => {
    expect(parseTimelineMarkdown(["```bash", "pnpm verify"].join("\n"))).toEqual([
      { type: "code", language: "bash", text: "pnpm verify" }
    ]);
  });
});
