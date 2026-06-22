export type TimelineMarkdownBlock =
  | {
      readonly type: "heading";
      readonly level: 1 | 2 | 3;
      readonly text: string;
    }
  | {
      readonly type: "paragraph";
      readonly text: string;
    }
  | {
      readonly type: "list";
      readonly ordered: boolean;
      readonly items: readonly string[];
    }
  | {
      readonly type: "code";
      readonly language?: string;
      readonly text: string;
    };

export function parseTimelineMarkdown(source: string): readonly TimelineMarkdownBlock[] {
  const blocks: TimelineMarkdownBlock[] = [];
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  let paragraph: string[] = [];
  let list: { ordered: boolean; items: string[] } | undefined;
  let code:
    | {
        language?: string;
        lines: string[];
      }
    | undefined;

  const flushParagraph = () => {
    if (paragraph.length === 0) {
      return;
    }

    blocks.push({
      type: "paragraph",
      text: paragraph.join("\n").trim()
    });
    paragraph = [];
  };

  const flushList = () => {
    if (!list) {
      return;
    }

    blocks.push({
      type: "list",
      ordered: list.ordered,
      items: list.items
    });
    list = undefined;
  };

  const flushText = () => {
    flushParagraph();
    flushList();
  };

  for (const line of lines) {
    const fence = line.match(/^\s*```([A-Za-z0-9_-]+)?\s*$/);
    if (fence) {
      if (code) {
        blocks.push({
          type: "code",
          language: code.language,
          text: code.lines.join("\n")
        });
        code = undefined;
      } else {
        flushText();
        code = {
          language: fence[1],
          lines: []
        };
      }
      continue;
    }

    if (code) {
      code.lines.push(line);
      continue;
    }

    if (line.trim().length === 0) {
      flushText();
      continue;
    }

    const heading = line.match(/^\s{0,3}(#{1,3})\s+(.+)$/);
    if (heading?.[1] && heading[2]) {
      flushText();
      blocks.push({
        type: "heading",
        level: heading[1].length as 1 | 2 | 3,
        text: heading[2].trim()
      });
      continue;
    }

    const unordered = line.match(/^\s*[-*]\s+(.+)$/);
    const ordered = line.match(/^\s*\d+[.)]\s+(.+)$/);
    if (unordered || ordered) {
      flushParagraph();
      const isOrdered = Boolean(ordered);
      if (list && list.ordered !== isOrdered) {
        flushList();
      }
      list ??= { ordered: isOrdered, items: [] };
      list.items.push((unordered?.[1] ?? ordered?.[1] ?? "").trim());
      continue;
    }

    flushList();
    paragraph.push(line);
  }

  if (code) {
    blocks.push({
      type: "code",
      language: code.language,
      text: code.lines.join("\n")
    });
  }
  flushText();

  return blocks.filter((block) => block.type !== "paragraph" || block.text.length > 0);
}
