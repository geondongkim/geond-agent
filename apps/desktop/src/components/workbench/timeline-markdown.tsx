import { Fragment, type ReactNode } from "react";

import { parseTimelineMarkdown } from "../../lib/timeline-markdown.js";

export function TimelineMarkdown({ text }: { readonly text: string }) {
  const blocks = parseTimelineMarkdown(text);

  if (blocks.length === 0) {
    return null;
  }

  return (
    <div className="timeline-markdown">
      {blocks.map((block, index) => {
        switch (block.type) {
          case "heading": {
            const Heading = block.level === 1 ? "h3" : block.level === 2 ? "h4" : "h5";
            return <Heading key={index}>{renderInline(block.text)}</Heading>;
          }
          case "paragraph":
            return <p key={index}>{renderInline(block.text)}</p>;
          case "list": {
            const List = block.ordered ? "ol" : "ul";
            return (
              <List key={index}>
                {block.items.map((item, itemIndex) => (
                  <li key={`${index}:${itemIndex}`}>{renderInline(item)}</li>
                ))}
              </List>
            );
          }
          case "code":
            return (
              <pre key={index} data-language={block.language ?? undefined}>
                <code>{block.text}</code>
              </pre>
            );
        }
      })}
    </div>
  );
}

function renderInline(text: string): ReactNode {
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g).filter((part) => part.length > 0);

  return parts.map((part, index) => {
    if (part.startsWith("`") && part.endsWith("`") && part.length > 1) {
      return <code key={index}>{part.slice(1, -1)}</code>;
    }

    if (part.startsWith("**") && part.endsWith("**") && part.length > 3) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }

    return <Fragment key={index}>{part}</Fragment>;
  });
}
