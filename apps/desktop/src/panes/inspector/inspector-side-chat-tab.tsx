import type { UiI18n } from "@geond-agent/ui-workbench";
import { MessageSquare, Send, Trash2 } from "lucide-react";
import { useState } from "react";

import { Button } from "../../components/ui/button.js";
import { TabsContent } from "../../components/ui/tabs.js";
import { EmptyState } from "../../components/workbench/empty-state.js";

interface SideChatDraft {
  readonly id: string;
  readonly text: string;
}

export function InspectorSideChatTab({
  i18n,
  setComposerPrompt
}: {
  readonly i18n: UiI18n;
  readonly setComposerPrompt: (prompt: string) => void;
}) {
  const [draft, setDraft] = useState("");
  const [queue, setQueue] = useState<readonly SideChatDraft[]>([]);
  const trimmedDraft = draft.trim();

  function queueDraft() {
    if (!trimmedDraft) {
      return;
    }

    setQueue((current) => [
      ...current,
      {
        id: `side-chat-draft-${Date.now()}-${current.length + 1}`,
        text: trimmedDraft
      }
    ]);
    setDraft("");
  }

  return (
    <TabsContent value="chat" className="border-0 bg-transparent p-0">
      <section className="side-chat-panel">
        <div className="flex min-w-0 items-start gap-3">
          <span className="side-chat-icon">
            <MessageSquare size={16} />
          </span>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold">{i18n.t("workbench.sideChat.title")}</h3>
            <p className="mt-2 text-xs leading-5 text-[color:var(--ink-soft)]">
              {i18n.t("workbench.sideChat.detail")}
            </p>
          </div>
        </div>
        <label className="mt-3 block">
          <span className="muted-meta">{i18n.t("workbench.sideChat.draftLabel")}</span>
          <textarea
            className="side-chat-input"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder={i18n.t("workbench.sideChat.placeholder")}
          />
        </label>
        <div className="mt-3 flex flex-wrap justify-end gap-2">
          <Button className="gap-2" onClick={queueDraft} disabled={!trimmedDraft}>
            <MessageSquare size={14} />
            {i18n.t("workbench.sideChat.queueDraft")}
          </Button>
        </div>
      </section>

      <section className="side-chat-panel mt-3">
        <div className="review-section-heading">
          <h3>{i18n.t("workbench.sideChat.queuedDrafts")}</h3>
          <span className="metric-pill">{queue.length}</span>
        </div>
        {queue.length ? (
          <div className="space-y-2">
            {queue.map((item) => (
              <article key={item.id} className="side-chat-draft-card">
                <p className="whitespace-pre-wrap text-sm leading-6 text-[color:var(--ink-soft)]">
                  {item.text}
                </p>
                <div className="mt-3 flex flex-wrap justify-end gap-2">
                  <Button
                    variant="outline"
                    className="gap-2"
                    onClick={() => setQueue((current) => current.filter((draftItem) => draftItem.id !== item.id))}
                  >
                    <Trash2 size={14} />
                    {i18n.t("workbench.sideChat.removeDraft")}
                  </Button>
                  <Button
                    className="gap-2"
                    onClick={() => {
                      setComposerPrompt(item.text);
                      setQueue((current) => current.filter((draftItem) => draftItem.id !== item.id));
                    }}
                  >
                    <Send size={14} />
                    {i18n.t("workbench.sideChat.useInComposer")}
                  </Button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState text={i18n.t("workbench.sideChat.empty")} />
        )}
      </section>
    </TabsContent>
  );
}
